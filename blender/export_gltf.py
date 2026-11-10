import bpy
import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

class GLTFExporter:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.export_settings = config.get("exportSettings", {})
        self.input_blend = config.get("inputBlend", "")
        self.output_dir = config.get("outputDir", "")
        self.format = config.get("format", "GLTF")

    def setup_scene(self):
        if self.input_blend and os.path.exists(self.input_blend):
            bpy.ops.wm.open_mainfile(filepath=self.input_blend)
        else:
            print(f"Warning: Input blend file not found: {self.input_blend}")

    def configure_export(self) -> Dict[str, Any]:
        settings = {
            "export_format": self.format,
            "export_copyright": "",
            "export_image_format": self.export_settings.get("exportImageFormat", "AUTO"),
            "export_image_quality": self.export_settings.get("exportImageQuality", 75),
            "export_texcoords": True,
            "export_normals": True,
            "export_tangents": self.export_settings.get("exportTangents", True),
            "export_materials": self.export_settings.get("exportMaterial", "EXPORT"),
            "export_colors": self.export_settings.get("exportColors", True),
            "export_cameras": self.export_settings.get("exportCameras", False),
            "export_lights": self.export_settings.get("exportLights", False),
            "export_extras": self.export_settings.get("exportExtras", True),
            "export_yup": self.export_settings.get("exportYup", True),
            "export_apply": self.export_settings.get("applyModifiers", True),
            "export_animations": self.export_settings.get("exportAnimations", True),
            "export_frame_range": self.export_settings.get("exportFrameRange", False),
            "export_frame_step": self.export_settings.get("exportFrameStep", 1),
            "export_force_sampling": self.export_settings.get("exportForceSampling", True),
            "export_nla_strips": self.export_settings.get("exportNlaStrips", True),
            "export_def_bones": self.export_settings.get("exportDefBones", True),
            "export_optimize_animation_size": self.export_settings.get("exportOptimizeAnimationSize", True),
            "export_animation_mode": self.export_settings.get("exportAnimationMode", "ACTIONS"),
            "export_selected": self.export_settings.get("selectedOnly", False),
            "export_current_frame": self.export_settings.get("exportCurrentFrame", False),
            "export_skins": self.export_settings.get("exportSkins", True),
            "export_shape_keys": self.export_settings.get("exportShapeKeys", True),
            "export_relative_paths": self.export_settings.get("exportRelativePaths", True),
        }

        if self.export_settings.get("textureDirectory"):
            settings["export_texture_dir"] = self.export_settings["textureDirectory"]

        return settings

    def export(self) -> List[str]:
        self.setup_scene()

        export_settings = self.configure_export()
        output_files = []

        os.makedirs(self.output_dir, exist_ok=True)

        base_name = Path(self.input_blend).stem if self.input_blend else "scene"
        ext = "glb" if self.format == "GLB" else "gltf"
        output_path = os.path.join(self.output_dir, f"{base_name}.{ext}")

        if self.export_settings.get("selectedOnly"):
            bpy.ops.object.select_all(action='DESELECT')
            for obj in bpy.context.scene.objects:
                if obj.select_get():
                    pass
        else:
            bpy.ops.object.select_all(action='SELECT')

        if self.format == "GLB":
            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLB',
                **{k: v for k, v in export_settings.items() if k != "export_format"}
            )
        else:
            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLTF_SEPARATE',
                **{k: v for k, v in export_settings.items() if k != "export_format"}
            )

        output_files.append(output_path)
        print(f"Exported: {output_path}")

        if self.format == "GLTF":
            for f in os.listdir(self.output_dir):
                if f.startswith(base_name) and f != f"{base_name}.gltf":
                    output_files.append(os.path.join(self.output_dir, f))

        return output_files

    def export_animations_separately(self) -> Dict[str, str]:
        self.setup_scene()
        output_files = {}

        os.makedirs(self.output_dir, exist_ok=True)
        base_name = Path(self.input_blend).stem if self.input_blend else "scene"

        for action in bpy.data.actions:
            action_name = action.name.replace(" ", "_").replace("/", "_")
            output_path = os.path.join(self.output_dir, f"{base_name}_{action_name}.glb")

            for obj in bpy.data.objects:
                if obj.animation_data:
                    obj.animation_data.action = action

            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLB',
                export_animations=True,
                export_animation_mode='ACTIONS',
                export_apply=True,
                export_yup=True,
            )
            output_files[action.name] = output_path
            print(f"Exported animation '{action.name}': {output_path}")

        return output_files


def parse_args():
    parser = argparse.ArgumentParser(description="Blender GLTF Export Script")
    parser.add_argument("--config", type=str, required=True, help="Path to JSON config file")
    parser.add_argument("--input", type=str, help="Input .blend file")
    parser.add_argument("--output", type=str, help="Output directory")
    parser.add_argument("--format", type=str, choices=["GLTF", "GLB"], default="GLTF")
    parser.add_argument("--animations-only", action="store_true", help="Export each action separately")
    return parser.parse_args()


def load_config(config_path: str) -> Dict[str, Any]:
    with open(config_path, "r") as f:
        return json.load(f)


def main():
    if "--" not in sys.argv:
        print("This script must be run from Blender: blender -b -P export_gltf.py -- --config config.json")
        return

    args = parse_args()
    config = load_config(args.config)

    if args.input:
        config["inputBlend"] = args.input
    if args.output:
        config["outputDir"] = args.output
    if args.format:
        config["format"] = args.format

    exporter = GLTFExporter(config)

    if args.animations_only:
        exporter.export_animations_separately()
    else:
        exporter.export()


if __name__ == "__main__":
    main()