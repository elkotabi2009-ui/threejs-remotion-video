import bpy
import json
import os
import sys
import argparse
import random
import math
from pathlib import Path
from typing import Dict, List, Any, Optional

class AssetGenerator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.generation_settings = config.get("generationSettings", {})
        self.output_dir = config.get("outputDir", "")
        self.asset_types = config.get("assetTypes", [])
        self.count = config.get("count", 10)
        self.seed = config.get("seed", 42)

    def setup_scene(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.frame_start = 1
        bpy.context.scene.frame_end = 250
        bpy.context.scene.render.fps = 30

        random.seed(self.seed)

    def clear_scene(self):
        for obj in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        for mesh in bpy.data.meshes:
            bpy.data.meshes.remove(mesh, do_unlink=True)
        for mat in bpy.data.materials:
            bpy.data.materials.remove(mat, do_unlink=True)

    def generate_primitives(self) -> List[str]:
        created = []

        for i in range(self.count):
            prim_type = random.choice(["cube", "sphere", "cylinder", "cone", "torus", "plane"])

            if prim_type == "cube":
                bpy.ops.mesh.primitive_cube_add(
                    size=random.uniform(0.5, 2),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), random.uniform(0, 5))
                )
            elif prim_type == "sphere":
                bpy.ops.mesh.primitive_uv_sphere_add(
                    radius=random.uniform(0.3, 1.5),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), random.uniform(0, 5))
                )
            elif prim_type == "cylinder":
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=random.uniform(0.3, 1),
                    depth=random.uniform(1, 3),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), random.uniform(0, 5))
                )
            elif prim_type == "cone":
                bpy.ops.mesh.primitive_cone_add(
                    radius1=random.uniform(0.3, 1),
                    depth=random.uniform(1, 3),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), random.uniform(0, 5))
                )
            elif prim_type == "torus":
                bpy.ops.mesh.primitive_torus_add(
                    major_radius=random.uniform(0.5, 1.5),
                    minor_radius=random.uniform(0.1, 0.5),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), random.uniform(0, 5))
                )
            elif prim_type == "plane":
                bpy.ops.mesh.primitive_plane_add(
                    size=random.uniform(2, 5),
                    location=(random.uniform(-5, 5), random.uniform(-5, 5), 0)
                )

            obj = bpy.context.active_object
            obj.name = f"{prim_type}_{i:03d}"
            self.apply_random_material(obj)
            self.add_random_animation(obj)
            created.append(obj.name)

        return created

    def apply_random_material(self, obj: bpy.types.Object):
        mat = bpy.data.materials.new(name=f"Mat_{obj.name}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links

        nodes.clear()

        output = nodes.new(type='ShaderNodeOutputMaterial')
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')

        bsdf.inputs['Base Color'].default_value = (
            random.random(),
            random.random(),
            random.random(),
            1
        )
        bsdf.inputs['Roughness'].default_value = random.uniform(0, 1)
        bsdf.inputs['Metallic'].default_value = random.uniform(0, 1)
        bsdf.inputs['Specular'].default_value = random.uniform(0, 1)

        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)

    def add_random_animation(self, obj: bpy.types.Object):
        if random.random() < 0.7:
            frames = [1, 125, 250]
            for frame in frames:
                bpy.context.scene.frame_set(frame)
                obj.location = (
                    obj.location.x + random.uniform(-1, 1),
                    obj.location.y + random.uniform(-1, 1),
                    obj.location.z + random.uniform(-0.5, 0.5)
                )
                obj.rotation_euler = (
                    random.uniform(0, math.pi * 2),
                    random.uniform(0, math.pi * 2),
                    random.uniform(0, math.pi * 2)
                )
                obj.scale = (
                    random.uniform(0.8, 1.2),
                    random.uniform(0.8, 1.2),
                    random.uniform(0.8, 1.2)
                )
                obj.keyframe_insert(data_path="location", frame=frame)
                obj.keyframe_insert(data_path="rotation_euler", frame=frame)
                obj.keyframe_insert(data_path="scale", frame=frame)

    def generate_particles(self) -> str:
        bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
        plane = bpy.context.active_object
        plane.name = "Particle_Emitter"

        psys = plane.modifiers.new(name="ParticleSystem", type='PARTICLE_SYSTEM')
        ps = psys.particle_system
        ps.settings.count = self.count * 10
        ps.settings.frame_start = 1
        ps.settings.frame_end = 100
        ps.settings.lifetime = 250
        ps.settings.emit_from = 'FACE'
        ps.settings.use_emit_random = True
        ps.settings.particle_size = 0.05
        ps.settings.size_random = 0.5
        ps.settings.physics_type = 'NEWTON'
        ps.settings.effector_weights.gravity = 0.5

        return plane.name

    def generate_procedural_terrain(self, size: int = 100, resolution: int = 200) -> str:
        bpy.ops.mesh.primitive_grid_add(
            x_subdivisions=resolution,
            y_subdivisions=resolution,
            size=size,
            location=(0, 0, 0)
        )
        terrain = bpy.context.active_object
        terrain.name = "Procedural_Terrain"

        mod = terrain.modifiers.new(name="Displace", type='DISPLACE')
        tex = bpy.data.textures.new(name="TerrainNoise", type='CLOUDS')
        tex.noise_scale = 0.5
        tex.noise_depth = 4
        mod.texture = tex
        mod.strength = 5
        mod.mid_level = 0

        mat = bpy.data.materials.new(name="TerrainMat")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()

        output = nodes.new(type='ShaderNodeOutputMaterial')
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        color_ramp = nodes.new(type='ShaderNodeValToRGB')
        noise = nodes.new(type='ShaderNodeTexNoise')

        noise.inputs['Scale'].default_value = 50
        noise.inputs['Detail'].default_value = 8
        noise.inputs['Roughness'].default_value = 0.5

        color_ramp.color_ramp.elements[0].position = 0.3
        color_ramp.color_ramp.elements[0].color = (0.1, 0.3, 0.1, 1)
        color_ramp.color_ramp.elements[1].position = 0.6
        color_ramp.color_ramp.elements[1].color = (0.4, 0.3, 0.2, 1)
        color_ramp.color_ramp.elements.new(0.9).color = (0.8, 0.8, 0.8, 1)

        links.new(noise.outputs['Fac'], color_ramp.inputs['Fac'])
        links.new(color_ramp.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

        if terrain.data.materials:
            terrain.data.materials[0] = mat
        else:
            terrain.data.materials.append(mat)

        return terrain.name

    def generate_city_blocks(self, blocks_x: int = 5, blocks_y: int = 5, block_size: int = 10) -> List[str]:
        created = []

        for x in range(blocks_x):
            for y in range(blocks_y):
                height = random.uniform(5, 50)
                width = random.uniform(3, 8)
                depth = random.uniform(3, 8)

                bpy.ops.mesh.primitive_cube_add(
                    size=1,
                    location=(
                        x * block_size - (blocks_x * block_size) / 2,
                        y * block_size - (blocks_y * block_size) / 2,
                        height / 2
                    )
                )
                building = bpy.context.active_object
                building.scale = (width / 2, depth / 2, height / 2)
                building.name = f"Building_{x}_{y}"

                self.apply_building_material(building)
                created.append(building.name)

        return created

    def apply_building_material(self, obj: bpy.types.Object):
        mat = bpy.data.materials.new(name=f"BuildingMat_{obj.name}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()

        output = nodes.new(type='ShaderNodeOutputMaterial')
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        window_tex = nodes.new(type='ShaderNodeTexNoise')
        color_ramp = nodes.new(type='ShaderNodeValToRGB')

        window_tex.inputs['Scale'].default_value = 20
        window_tex.inputs['Detail'].default_value = 4

        color_ramp.color_ramp.elements[0].color = (0.15, 0.15, 0.15, 1)
        color_ramp.color_ramp.elements[1].color = (0.9, 0.8, 0.4, 1)
        color_ramp.color_ramp.elements[0].position = 0.7

        links.new(window_tex.outputs['Fac'], color_ramp.inputs['Fac'])
        links.new(color_ramp.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

        bsdf.inputs['Roughness'].default_value = 0.8
        bsdf.inputs['Specular'].default_value = 0.3

        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)

    def export_all(self, format: str = "GLTF") -> List[str]:
        os.makedirs(self.output_dir, exist_ok=True)
        exported = []

        for obj in bpy.data.objects:
            if obj.type == 'MESH':
                base_name = obj.name
                output_path = os.path.join(self.output_dir, f"{base_name}.{format.lower()}")

                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj

                if format == "GLB":
                    bpy.ops.export_scene.gltf(
                        filepath=output_path,
                        export_format='GLB',
                        use_selection=True,
                        export_apply=True,
                        export_yup=True,
                    )
                else:
                    bpy.ops.export_scene.gltf(
                        filepath=output_path,
                        export_format='GLTF_SEPARATE',
                        use_selection=True,
                        export_apply=True,
                        export_yup=True,
                    )

                exported.append(output_path)
                print(f"Exported: {base_name}")

        return exported


def parse_args():
    parser = argparse.ArgumentParser(description="Blender Procedural Asset Generator")
    parser.add_argument("--config", type=str, required=True, help="Path to JSON config file")
    parser.add_argument("--output", type=str, help="Output directory")
    parser.add_argument("--count", type=int, help="Number of assets to generate")
    parser.add_argument("--seed", type=int, help="Random seed")
    parser.add_argument("--type", type=str, choices=["primitives", "particles", "terrain", "city", "all"], default="all")
    return parser.parse_args()


def load_config(config_path: str) -> Dict[str, Any]:
    with open(config_path, "r") as f:
        return json.load(f)


def main():
    if "--" not in sys.argv:
        print("This script must be run from Blender: blender -b -P generate_assets.py -- --config config.json")
        return

    args = parse_args()
    config = load_config(args.config)

    if args.output:
        config["outputDir"] = args.output
    if args.count:
        config["count"] = args.count
    if args.seed:
        config["seed"] = args.seed

    generator = AssetGenerator(config)
    generator.setup_scene()

    if args.type in ["primitives", "all"]:
        generator.generate_primitives()
    if args.type in ["particles", "all"]:
        generator.generate_particles()
    if args.type in ["terrain", "all"]:
        generator.generate_procedural_terrain()
    if args.type in ["city", "all"]:
        generator.generate_city_blocks()

    generator.export_all()


if __name__ == "__main__":
    main()