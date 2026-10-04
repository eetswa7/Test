const encoder=new TextEncoder();
export const bytes=value=>encoder.encode(value);
export function base64url(data){let str='';for(const b of new Uint8Array(data))str+=String.fromCharCode(b);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function fromBase64url(str,max=4096){if(typeof str!=='string'||!/^[A-Za-z0-9_-]*$/.test(str)||str.length>max)throw new Error('Invalid encoding');const binary=atob(str.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,c=>c.charCodeAt(0));}
export async function digest(text){return base64url(await crypto.subtle.digest('SHA-256',bytes(text)));}
export const signatureMessage=(credential,timestamp,hash)=>`BREACHLINE-BENCHMARK-V1\n${credential}\n${timestamp}\n${hash}`;
