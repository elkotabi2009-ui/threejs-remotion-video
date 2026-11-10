import bpy
import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

class AnimationBaker:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.bake_settings = config.get("bakeSettings", {})
        self.input_blend = config.get("inputBlend", "")
        self.output_blend = config.get("outputBlend", "")
        self.frame_start = config.get("frameStart", 1)
        self.frame_end = config.get("frameEnd", 250)
        self.step = config.get("step", 1)

    def setup_scene(self):
        if self.input_blend and os.path.exists(self.input_blend):
            bpy.ops.wm.open_mainfile(filepath=self.input_blend)
            print(f"Opened: {self.input_blend}")
        else:
            print(f"Warning: Input blend file not found: {self.input_blend}")

    def bake_object_animations(self, objects: List[str] = None) -> Dict[str, Any]:
        results = {"baked_objects": [], "errors": []}

        target_objects = objects if objects else [obj.name for obj in bpy.data.objects]

        for obj_name in target_objects:
            obj = bpy.data.objects.get(obj_name)
            if not obj:
                results["errors"].append(f"Object not found: {obj_name}")
                continue

            try:
                self.bake_object(obj)
                results["baked_objects"].append(obj_name)
                print(f"Baked animation for: {obj_name}")
            except Exception as e:
                results["errors"].append(f"Failed to bake {obj_name}: {str(e)}")

        return results

    def bake_object(self, obj: bpy.types.Object):
        if obj.animation_data and obj.animation_data.action:
            action = obj.animation_data.action
            fcurves = action.fcurves

            for fc in fcurves:
                for kf in fc.keyframe_points:
                    kf.interpolation = 'LINEAR'

        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        bpy.ops.nla.bake(
            frame_start=self.frame_start,
            frame_end=self.frame_end,
            step=self.step,
            only_selected=True,
            visual_keying=True,
            clear_constraints=self.bake_settings.get("clearConstraints", False),
            clear_parents=self.bake_settings.get("clearParents", False),
            use_current_action=True,
            bake_types={'OBJECT', 'POSE'},
        )

        obj.select_set(False)

    def bake_nla_to_actions(self) -> List[str]:
        created_actions = []

        for obj in bpy.data.objects:
            if obj.animation_data and obj.animation_data.nla_tracks:
                for track in obj.animation_data.nla_tracks:
                    for strip in track.strips:
                        if strip.action:
                            new_action = strip.action.copy()
                            new_action.name = f"{obj.name}_{strip.name}_baked"
                            created_actions.append(new_action.name)

                            for fc in new_action.fcurves:
                                for kf in fc.keyframe_points:
                                    kf.interpolation = 'LINEAR'

        return created_actions

    def cleanup_animations(self, keep_actions: List[str] = None):
        keep_set = set(keep_actions or [])

        actions_to_remove = []
        for action in bpy.data.actions:
            if action.name not in keep_set:
                if action.users == 0:
                    actions_to_remove.append(action)

        for action in actions_to_remove:
            bpy.data.actions.remove(action)
            print(f"Removed unused action: {action.name}")

    def optimize_keyframes(self, threshold: float = 0.001):
        for action in bpy.data.actions:
            for fc in action.fcurves:
                keyframes = fc.keyframe_points
                to_remove = []

                for i in range(1, len(keyframes) - 1):
                    prev = keyframes[i - 1]
                    curr = keyframes[i]
                    next_kf = keyframes[i + 1]

                    if abs(curr.co[1] - prev.co[1]) < threshold and abs(next_kf.co[1] - curr.co[1]) < threshold:
                        to_remove.append(i)

                for idx in reversed(to_remove):
                    keyframes.remove(keyframes[idx])

    def save_output(self):
        if self.output_blend:
            bpy.ops.wm.save_as_mainfile(filepath=self.output_blend)
            print(f"Saved baked file: {self.output_blend}")


def parse_args():
    parser = argparse.ArgumentParser(description="Blender Animation Baking Script")
    parser.add_argument("--config", type=str, required=True, help="Path to JSON config file")
    parser.add_argument("--input", type=str, help="Input .blend file")
    parser.add_argument("--output", type=str, help="Output .blend file")
    parser.add_argument("--objects", type=str, help="Comma-separated list of object names to bake")
    parser.add_argument("--frame-start", type=int, help="Start frame")
    parser.add_argument("--frame-end", type=int, help="End frame")
    return parser.parse_args()


def load_config(config_path: str) -> Dict[str, Any]:
    with open(config_path, "r") as f:
        return json.load(f)


def main():
    if "--" not in sys.argv:
        print("This script must be run from Blender: blender -b -P bake_animations.py -- --config config.json")
        return

    args = parse_args()
    config = load_config(args.config)

    if args.input:
        config["inputBlend"] = args.input
    if args.output:
        config["outputBlend"] = args.output
    if args.frame_start:
        config["frameStart"] = args.frame_start
    if args.frame_end:
        config["frameEnd"] = args.frame_end

    baker = AnimationBaker(config)
    baker.setup_scene()

    objects = args.objects.split(",") if args.objects else None
    baker.bake_object_animations(objects)
    baker.bake_nla_to_actions()
    baker.optimize_keyframes()

    baker.save_output()


if __name__ == "__main__":
    main()