"""Match the editable levels and Cycles GI to the shipped material reflectance.

Level instances share geometry, but retain their own paint, texel scale and
emission. Object display colours alone do not affect Cycles light transport.
"""
import bpy
from mathutils import Vector


def srgb(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


class LevelMaterials:
    def __init__(self):
        self.cache = {}
        self.images = {}

    def tile(self, index):
        if index in self.images:
            return self.images[index]
        atlas = bpy.data.images['surfaces-albedo']
        # A tile has its own Repeat boundary. Sampling the complete atlas with
        # box projection would bleed neighbouring concrete/wood/fabric tiles.
        import numpy as np
        data = np.empty(atlas.size[0] * atlas.size[1] * 4, dtype=np.float32)
        atlas.pixels.foreach_get(data)
        data = data.reshape((atlas.size[1], atlas.size[0], 4))
        edge = atlas.size[0] // 4
        x, y = index % 4 * edge, (3 - index // 4) * edge
        image = bpy.data.images.new('Level reflectance / surface ' + str(index), width=edge, height=edge)
        image.colorspace_settings.name = 'sRGB'
        image.pixels.foreach_set(data[y:y+edge, x:x+edge].copy().ravel())
        image.pack(); image.use_fake_user = True
        self.images[index] = image
        return image

    def material(self, part):
        desc = part['material']; tile = int(desc.get('pattern', 0)) - 1
        color = tuple(desc.get('color', (1, 1, 1)))
        authored = part.get('authoredColour', False)
        # Match the renderer's light tint for textured architectural surfaces.
        tint = (1, 1, 1) if authored else tuple(.85 + c*.15 for c in color) if tile >= 0 else color
        matrix = part['matrix']
        dims = tuple(Vector(matrix[i:i+3]).length for i in (0, 4, 8))
        key = (tile, tint, authored, round(desc.get('emissive', 0), 3), tuple(round(v, 3) for v in dims), part['surface'])
        if key in self.cache:
            return self.cache[key]
        material = bpy.data.materials.new('Level / ' + part['surface'] + ' / ' + str(len(self.cache)))
        material.use_nodes = True
        nodes = material.node_tree.nodes; links = material.node_tree.links
        bsdf = nodes.get('Principled BSDF')
        bsdf.inputs['Roughness'].default_value = desc.get('rough', .75)
        bsdf.inputs['Metallic'].default_value = desc.get('metal', 0)
        vertex = nodes.new('ShaderNodeVertexColor'); vertex.layer_name = 'BakedColourAO'
        multiply = nodes.new('ShaderNodeMixRGB'); multiply.blend_type = 'MULTIPLY'
        multiply.inputs[0].default_value = 1
        multiply.inputs[2].default_value = (*[srgb(v) for v in tint], 1)
        links.new(vertex.outputs['Color'], multiply.inputs[1])
        color_socket = multiply.outputs[0]
        if 0 <= tile < 16 and not authored:
            uv = nodes.new('ShaderNodeTexCoord')
            scale = nodes.new('ShaderNodeVectorMath'); scale.operation = 'MULTIPLY'
            # Blender Z is game Y, and Blender Y is negative game Z.
            scale.inputs[1].default_value = (dims[0]*.7, dims[2]*.7, dims[1]*.7)
            links.new(uv.outputs['Generated'], scale.inputs[0])
            image = nodes.new('ShaderNodeTexImage'); image.image = self.tile(tile)
            image.extension = 'REPEAT'; image.projection = 'BOX'; image.projection_blend = .04
            links.new(scale.outputs[0], image.inputs['Vector'])
            textured = nodes.new('ShaderNodeMixRGB'); textured.blend_type = 'MULTIPLY'
            textured.inputs[0].default_value = 1
            links.new(color_socket, textured.inputs[1]); links.new(image.outputs['Color'], textured.inputs[2])
            color_socket = textured.outputs[0]
        links.new(color_socket, bsdf.inputs['Base Color'])
        if desc.get('emissive', 0) > 0:
            links.new(color_socket, bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Strength'].default_value = desc['emissive'] * .7
        self.cache[key] = material
        return material

    def assign(self, obj, part):
        obj.material_slots[0].link = 'OBJECT'
        obj.material_slots[0].material = self.material(part)
