import {createHash} from 'node:crypto';

// Core glTF supports normalised 16-bit colours and UVs. Physical material UVs
// are bounded scalars, so both streams can use this format without an extension
// or a decoder. Positions, normals, texture UVs and indices stay byte-exact.
export function compactBlenderGLB(input){
 if(input.readUInt32LE(0)!==0x46546c67||input.readUInt32LE(4)!==2||input.readUInt32LE(8)!==input.length)throw Error('Invalid native Blender GLB');
 let json,bin;
 for(let offset=12;offset<input.length;){
  const size=input.readUInt32LE(offset),kind=input.readUInt32LE(offset+4),data=input.subarray(offset+8,offset+8+size);
  if(kind===0x4e4f534a)json=JSON.parse(data.toString('utf8'));
  if(kind===0x004e4942)bin=data;
  offset+=size+8;
 }
 if(!json||!bin||json.buffers?.length!==1||json.extensionsRequired?.length)throw Error('Unsupported native library');
 const quantise=new Map();
 for(const mesh of json.meshes)for(const primitive of mesh.primitives){
  for(const name of ['COLOR_0','TEXCOORD_1'])if(primitive.attributes[name]!==undefined)quantise.set(primitive.attributes[name],name);
 }
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},bytes={5121:1,5123:2,5125:4,5126:4};
 const views=[],chunks=[],exactSource=createHash('sha256'),exactPacked=createHash('sha256');
 let length=0,savedBytes=0,maxColourError=0,maxMaterialError=0,streams=0;
 for(const accessor of json.accessors){
  const old=json.bufferViews[accessor.bufferView],size=sizes[accessor.type],width=bytes[accessor.componentType];
  if(!old||old.buffer!==0||!size||!width||accessor.sparse)throw Error('Unsupported accessor layout');
  const index=json.accessors.indexOf(accessor),kind=quantise.get(index),compact=!!kind&&accessor.componentType===5126;
  const stride=old.byteStride??size*width,start=(old.byteOffset??0)+(accessor.byteOffset??0);
  const raw=Buffer.alloc(accessor.count*size*width),output=compact?Buffer.alloc(accessor.count*size*2):raw;
  for(let i=0;i<accessor.count;i++){
   bin.copy(raw,i*size*width,start+i*stride,start+i*stride+size*width);
   if(compact)for(let j=0;j<size;j++){
    const value=raw.readFloatLE((i*size+j)*4);
    if(!Number.isFinite(value)||value<0||value>1)throw Error('Physical scalar outside normalised range');
    const quantised=Math.round(value*65535);output.writeUInt16LE(quantised,(i*size+j)*2);
    const error=Math.abs(value-quantised/65535);
    if(kind==='COLOR_0')maxColourError=Math.max(maxColourError,error);else maxMaterialError=Math.max(maxMaterialError,error);
   }
  }
  if(compact){
   accessor.componentType=5123;accessor.normalized=true;delete accessor.min;delete accessor.max;
   savedBytes+=raw.length-output.length;streams++;
  }else{exactSource.update(raw);exactPacked.update(output);}
  const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}
  const view={buffer:0,byteOffset:length,byteLength:output.length};if(old.target)view.target=old.target;
  accessor.bufferView=views.length;accessor.byteOffset=0;views.push(view);chunks.push(output);length+=output.length;
 }
 const sourceHash=exactSource.digest('hex'),packedHash=exactPacked.digest('hex');
 if(sourceHash!==packedHash)throw Error('Exact geometry stream changed during packing');
 json.bufferViews=views;json.buffers=[{byteLength:length}];
 const encoded=Buffer.from(JSON.stringify(json)),jsonPadding=(4-encoded.length%4)%4,binPadding=(4-length%4)%4;
 const output=Buffer.alloc(12+8+encoded.length+jsonPadding+8+length+binPadding);
 output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
 output.writeUInt32LE(encoded.length+jsonPadding,12);output.writeUInt32LE(0x4e4f534a,16);encoded.copy(output,20);
 output.fill(0x20,20+encoded.length,20+encoded.length+jsonPadding);
 const offset=20+encoded.length+jsonPadding;
 output.writeUInt32LE(length+binPadding,offset);output.writeUInt32LE(0x004e4942,offset+4);Buffer.concat(chunks).copy(output,offset+8);
 return {buffer:output,stats:{normalisedBits:16,streams,savedBytes,maxColourError,maxMaterialError,exactSourceSha256:sourceHash,exactPackedSha256:packedHash}};
}
