import { execSync, spawn, ChildProcess } from "child_process";
import { join, resolve, dirname } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";

// ============================================================================
// Types
// ============================================================================

export interface BlenderConfig {
  blenderPath: string;
  scriptsDir: string;
  tempDir: string;
  timeout: number;
  gpuEnabled: boolean;
  verbose: boolean;
}

export interface BlenderResult {
  success: boolean;
  outputPath: string;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
}

export interface ExportGLTFOptions {
  inputPath: string;
  outputPath: string;
  format: "glb" | "gltf";
  applyModifiers: boolean;
  exportAnimation: boolean;
  exportMaterials: boolean;
  exportCameras: boolean;
  exportLights: boolean;
  selectedOnly: boolean;
}

export interface BakeAnimationsOptions {
  inputPath: string;
  outputPath: string;
  frameStart: number;
  frameEnd: number;
  step: number;
  bakeTypes: ("location" | "rotation" | "scale" | "morph")[];
  clearConstraints: boolean;
  clearParents: boolean;
}

export interface GenerateAssetsOptions {
  type: "city" | "particles" | "terrain" | "abstract" | "text" | "logo" | "character" | "vehicle";
  outputPath: string;
  count?: number;
  complexity?: "low" | "medium" | "high";
  style?: string;
  seed?: number;
  dimensions?: { width: number; height: number; depth: number };
}

export interface BlenderScriptOptions {
  scriptName: string;
  args: Record<string, any>;
}

// ============================================================================
// Blender Runner Class
// ============================================================================

export class BlenderRunner {
  private config: BlenderConfig;
  private activeProcess: ChildProcess | null = null;

  constructor(config?: Partial<BlenderConfig>) {
    this.config = {
      blenderPath: config?.blenderPath || this.findBlender(),
      scriptsDir: config?.scriptsDir || join(process.cwd(), "blender"),
      tempDir: config?.tempDir || join(process.cwd(), ".blender-temp"),
      timeout: config?.timeout || 300000,
      gpuEnabled: config?.gpuEnabled ?? true,
      verbose: config?.verbose ?? false,
    };

    this.ensureDirectories();
    this.verifyBlender();
  }

  private findBlender(): string {
    const candidates = [
      "blender",
      "blender.exe",
      "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe",
      "C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe",
      "/usr/bin/blender",
      "/Applications/Blender.app/Contents/MacOS/Blender",
    ];

    for (const candidate of candidates) {
      try {
        execSync(`"${candidate}" --version`, { stdio: "ignore" });
        return candidate;
      } catch {
        // Continue
      }
    }

    return "blender"; // Default, will fail at runtime if not found
  }

  private verifyBlender(): void {
    try {
      const version = execSync(`"${this.config.blenderPath}" --version`, { encoding: "utf-8" });
      console.log(`[BlenderRunner] Found Blender: ${version.trim()}`);
    } catch (error) {
      throw new Error(`Blender not found at ${this.config.blenderPath}. Please install Blender or set blenderPath in config.`);
    }
  }

  private ensureDirectories(): void {
    [this.config.scriptsDir, this.config.tempDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Export blend file to GLTF/GLB
   */
  async exportGLTF(options: ExportGLTFOptions): Promise<BlenderResult> {
    const scriptPath = join(this.config.scriptsDir, "export_gltf.py");

    if (!existsSync(scriptPath)) {
      await this.createExportGLTFScript(scriptPath);
    }

    const args = {
      input: options.inputPath,
      output: options.outputPath,
      format: options.format,
      apply_modifiers: options.applyModifiers,
      export_animation: options.exportAnimation,
      export_materials: options.exportMaterials,
      export_cameras: options.exportCameras,
      export_lights: options.exportLights,
      selected_only: options.selectedOnly,
    };

    return this.runScript("export_gltf.py", args);
  }

  /**
   * Bake animations in blend file
   */
  async bakeAnimations(options: BakeAnimationsOptions): Promise<BlenderResult> {
    const scriptPath = join(this.config.scriptsDir, "bake_animations.py");

    if (!existsSync(scriptPath)) {
      await this.createBakeAnimationsScript(scriptPath);
    }

    const args = {
      input: options.inputPath,
      output: options.outputPath,
      frame_start: options.frameStart,
      frame_end: options.frameEnd,
      step: options.step,
      bake_types: options.bakeTypes,
      clear_constraints: options.clearConstraints,
      clear_parents: options.clearParents,
    };

    return this.runScript("bake_animations.py", args);
  }

  /**
   * Generate procedural assets
   */
  async generateAssets(options: GenerateAssetsOptions): Promise<BlenderResult> {
    const scriptPath = join(this.config.scriptsDir, "generate_assets.py");

    if (!existsSync(scriptPath)) {
      await this.createGenerateAssetsScript(scriptPath);
    }

    const args = {
      type: options.type,
      output: options.outputPath,
      count: options.count || 10,
      complexity: options.complexity || "medium",
      style: options.style || "default",
      seed: options.seed,
      dimensions: options.dimensions || { width: 100, height: 100, depth: 100 },
    };

    return this.runScript("generate_assets.py", args);
  }

  /**
   * Run arbitrary Blender Python script
   */
  async runScript(scriptName: string, args: Record<string, any>): Promise<BlenderResult> {
    const scriptPath = join(this.config.scriptsDir, scriptName);

    if (!existsSync(scriptPath)) {
      throw new Error(`Blender script not found: ${scriptPath}`);
    }

    // Write args as JSON file for the script to read
    const argsPath = join(this.config.tempDir, `${scriptName}-args-${Date.now()}.json`);
    writeFileSync(argsPath, JSON.stringify(args), "utf-8");

    const startTime = Date.now();
    let stdout = "";
    let stderr = "";

    return new Promise((resolve) => {
      // Build command
      const pythonArgs = `"${scriptPath}" "${argsPath}"`;
      const gpuFlag = this.config.gpuEnabled ? "--enable-gpu" : "";
      const command = `"${this.config.blenderPath}" --background ${gpuFlag} --python ${pythonArgs}`;

      if (this.config.verbose) {
        console.log(`[BlenderRunner] Running: ${command}`);
      }

      this.activeProcess = spawn(this.config.blenderPath, [
        "--background",
        ...(this.config.gpuEnabled ? ["--enable-gpu"] : []),
        "--python", scriptPath,
        "--", argsPath,
      ], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: this.config.timeout,
      });

      this.activeProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
        if (this.config.verbose) process.stdout.write(data);
      });

      this.activeProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
        if (this.config.verbose) process.stderr.write(data);
      });

      this.activeProcess.on("close", (code) => {
        const duration = Date.now() - startTime;
        this.activeProcess = null;

        // Cleanup args file
        try {
          require("fs").unlinkSync(argsPath);
        } catch { }

        if (code === 0) {
          // Try to find output file from stdout
          const outputMatch = stdout.match(/OUTPUT_FILE:(.+)/);
          const outputPath = outputMatch ? outputMatch[1].trim() : args.output || "";

          resolve({
            success: true,
            outputPath,
            stdout,
            stderr,
            duration,
          });
        } else {
          resolve({
            success: false,
            outputPath: "",
            stdout,
            stderr,
            duration,
            error: `Blender exited with code ${code}: ${stderr}`,
          });
        }
      });

      this.activeProcess.on("error", (error) => {
        this.activeProcess = null;
        resolve({
          success: false,
          outputPath: "",
          stdout,
          stderr,
          duration: Date.now() - startTime,
          error: error.message,
        });
      });
    });
  }

  /**
   * Kill any running Blender process
   */
  kill(): void {
    if (this.activeProcess) {
      this.activeProcess.kill("SIGTERM");
      this.activeProcess = null;
    }
  }

  // ============================================================================
  // Script Creation
  // ============================================================================

  private async createExportGLTFScript(scriptPath: string): Promise<void> {
    const script = `import bpy
import json
import sys
import os

def main():
    # Read arguments
    args_path = sys.argv[-1]
    with open(args_path, 'r') as f:
        args = json.load(f)

    input_path = args.get('input')
    output_path = args.get('output')
    format = args.get('format', 'glb')
    apply_modifiers = args.get('apply_modifiers', True)
    export_animation = args.get('export_animation', True)
    export_materials = args.get('export_materials', True)
    export_cameras = args.get('export_cameras', False)
    export_lights = args.get('export_lights', False)
    selected_only = args.get('selected_only', False)

    if not input_path or not output_path:
        print("ERROR: input and output paths required")
        sys.exit(1)

    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import blend file
    bpy.ops.wm.open_mainfile(filepath=input_path)

    # Apply modifiers if requested
    if apply_modifiers:
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                for mod in obj.modifiers:
                    try:
                        bpy.context.view_layer.objects.active = obj
                        bpy.ops.object.modifier_apply(modifier=mod.name)
                    except:
                        pass

    # Select objects to export
    if selected_only:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in bpy.context.scene.objects:
            if obj.select_get():
                obj.select_set(True)
    else:
        bpy.ops.object.select_all(action='SELECT')

    # Export GLTF
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format=format.upper(),
        export_apply=apply_modifiers,
        export_animations=export_animation,
        export_materials=export_materials,
        export_cameras=export_cameras,
        export_lights=export_lights,
        use_selection=selected_only,
    )

    print(f"OUTPUT_FILE:{output_path}")

if __name__ == "__main__":
    main()
`;

    writeFileSync(scriptPath, script, "utf-8");
  }

  private async createBakeAnimationsScript(scriptPath: string): Promise<void> {
    const script = `import bpy
import json
import sys
import os

def main():
    args_path = sys.argv[-1]
    with open(args_path, 'r') as f:
        args = json.load(f)

    input_path = args.get('input')
    output_path = args.get('output')
    frame_start = args.get('frame_start', 1)
    frame_end = args.get('frame_end', 250)
    step = args.get('step', 1)
    bake_types = args.get('bake_types', ['location', 'rotation', 'scale'])
    clear_constraints = args.get('clear_constraints', True)
    clear_parents = args.get('clear_parents', False)

    if not input_path or not output_path:
        print("ERROR: input and output paths required")
        sys.exit(1)

    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import blend file
    bpy.ops.wm.open_mainfile(filepath=input_path)

    # Set frame range
    bpy.context.scene.frame_start = frame_start
    bpy.context.scene.frame_end = frame_end

    # Bake animations for each object
    for obj in bpy.context.scene.objects:
        if obj.animation_data and obj.animation_data.action:
            # Select object
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

            # Bake action
            bpy.ops.nla.bake(
                frame_start=frame_start,
                frame_end=frame_end,
                step=step,
                only_selected=True,
                visual_keying=True,
                clear_constraints=clear_constraints,
                clear_parents=clear_parents,
                bake_types=bake_types,
            )

    # Save baked file
    bpy.ops.wm.save_as_mainfile(filepath=output_path)

    print(f"OUTPUT_FILE:{output_path}")

if __name__ == "__main__":
    main()
`;

    writeFileSync(scriptPath, script, "utf-8");
  }

  private async createGenerateAssetsScript(scriptPath: string): Promise<void> {
    const script = `import bpy
import json
import sys
import os
import random
import math

def main():
    args_path = sys.argv[-1]
    with open(args_path, 'r') as f:
        args = json.load(f)

    asset_type = args.get('type', 'abstract')
    output_path = args.get('output')
    count = args.get('count', 10)
    complexity = args.get('complexity', 'medium')
    style = args.get('style', 'default')
    seed = args.get('seed')
    dimensions = args.get('dimensions', {'width': 100, 'height': 100, 'depth': 100})

    if not output_path:
        print("ERROR: output path required")
        sys.exit(1)

    if seed is not None:
        random.seed(seed)

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Set up basic scene
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES' if complexity != 'low' else 'BLENDER_EEVEE'

    # Generate based on type
    if asset_type == 'city':
        generate_city(count, complexity, dimensions)
    elif asset_type == 'particles':
        generate_particles(count, complexity, dimensions)
    elif asset_type == 'terrain':
        generate_terrain(complexity, dimensions)
    elif asset_type == 'abstract':
        generate_abstract(count, complexity, dimensions, style)
    elif asset_type == 'text':
        generate_text(args.get('text', 'TEXT'), complexity, dimensions)
    elif asset_type == 'logo':
        generate_logo(args.get('svg_path'), complexity, dimensions)
    elif asset_type == 'character':
        generate_character(complexity, dimensions)
    elif asset_type == 'vehicle':
        generate_vehicle(complexity, dimensions)
    else:
        print(f"Unknown type: {asset_type}")
        sys.exit(1)

    # Save
    bpy.ops.wm.save_as_mainfile(filepath=output_path)
    print(f"OUTPUT_FILE:{output_path}")

def generate_city(count, complexity, dims):
    """Generate procedural city buildings"""
    w, h, d = dims['width'], dims['height'], dims['depth']
    building_count = count if complexity == 'high' else max(5, count // 2)

    for i in range(building_count):
        # Random building position
        x = random.uniform(-w/2, w/2)
        y = 0
        z = random.uniform(-d/2, d/2)

        # Building dimensions
        bw = random.uniform(5, 15)
        bh = random.uniform(10, 80) if complexity == 'high' else random.uniform(10, 40)
        bd = random.uniform(5, 15)

        # Create building
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y + bh/2, z))
        building = bpy.context.active_object
        building.scale = (bw/2, bh/2, bd/2)

        # Add windows (simple approach - bevel + array)
        if complexity == 'high':
            add_building_details(building)

        # Random material
        mat = bpy.data.materials.new(name=f"BuildingMat_{i}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (
                random.uniform(0.2, 0.6),
                random.uniform(0.2, 0.6),
                random.uniform(0.2, 0.7),
                1
            )

        building.data.materials.append(mat)

def add_building_details(building):
    """Add window-like details to building"""
    # Simple approach: use bevel modifier
    mod = building.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = 0.05
    mod.segments = 2

def generate_particles(count, complexity, dims):
    """Generate particle system"""
    w, h, d = dims['width'], dims['height'], dims['depth']

    # Create emitter
    bpy.ops.mesh.primitive_plane_add(size=max(w, d), location=(0, 0, 0))
    emitter = bpy.context.active_object

    # Particle system
    ps = emitter.modifiers.new(name="Particles", type='PARTICLE_SYSTEM')
    psys = emitter.particle_systems[0]
    settings = psys.settings

    settings.count = count * 100
    settings.frame_start = 1
    settings.frame_end = 100
    settings.lifetime = 100
    settings.emit_from = 'VOLUME'
    settings.distribution = 'RAND'
    settings.particle_size = 0.1
    settings.size_random = 0.5
    settings.physics_type = 'NEWTON'
    settings.velocity_factor_normal = 0.5

    # Render as halo/objects
    settings.render_type = 'HALO'
    settings.halo_size = 0.05

def generate_terrain(complexity, dims):
    """Generate procedural terrain"""
    w, h, d = dims['width'], dims['height'], dims['depth']
    resolution = 128 if complexity == 'high' else 64

    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=resolution,
        y_subdivisions=resolution,
        size=max(w, d),
        location=(0, 0, 0)
    )
    terrain = bpy.context.active_object

    # Displace modifier for terrain
    mod = terrain.modifiers.new(name="Displace", type='DISPLACE')
    tex = bpy.data.textures.new(name="TerrainNoise", type='CLOUDS')
    tex.noise_scale = 2.0
    tex.noise_depth = 4
    mod.texture = tex
    mod.strength = h * 0.5
    mod.mid_level = 0.5

    # Subdivision for smoother terrain
    if complexity == 'high':
        sub = terrain.modifiers.new(name="Subdiv", type='SUBSURF')
        sub.levels = 2
        sub.render_levels = 3

def generate_abstract(count, complexity, dims, style):
    """Generate abstract geometric shapes"""
    w, h, d = dims['width'], dims['height'], dims['depth']
    shapes = ['cube', 'sphere', 'cylinder', 'cone', 'torus']

    for i in range(count):
        shape = random.choice(shapes)
        x = random.uniform(-w/2, w/2)
        y = random.uniform(-h/2, h/2)
        z = random.uniform(-d/2, d/2)

        size = random.uniform(1, 5)

        if shape == 'cube':
            bpy.ops.mesh.primitive_cube_add(size=size, location=(x, y, z))
        elif shape == 'sphere':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=size, location=(x, y, z))
        elif shape == 'cylinder':
            bpy.ops.mesh.primitive_cylinder_add(radius=size, depth=size*2, location=(x, y, z))
        elif shape == 'cone':
            bpy.ops.mesh.primitive_cone_add(radius1=size, radius2=0, depth=size*2, location=(x, y, z))
        elif shape == 'torus':
            bpy.ops.mesh.primitive_torus_add(location=(x, y, z))

        obj = bpy.context.active_object
        obj.rotation_euler = (
            random.uniform(0, math.pi),
            random.uniform(0, math.pi),
            random.uniform(0, math.pi)
        )

        # Material
        mat = bpy.data.materials.new(name=f"AbstractMat_{i}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            if style == 'neon':
                # Emission for neon look
                emission = mat.node_tree.nodes.new('ShaderNodeEmission')
                emission.inputs['Color'].default_value = (
                    random.random(),
                    random.random(),
                    random.random(),
                    1
                )
                emission.inputs['Strength'].default_value = 10
                mat.node_tree.links.new(emission.outputs[0], mat.node_tree.nodes.get('Material Output').inputs[0])
            else:
                bsdf.inputs['Base Color'].default_value = (
                    random.random(),
                    random.random(),
                    random.random(),
                    1
                )
                bsdf.inputs['Metallic'].default_value = random.random()
                bsdf.inputs['Roughness'].default_value = random.random()

        obj.data.materials.append(mat)

def generate_text(text, complexity, dims):
    """Generate 3D text"""
    bpy.ops.object.text_add(location=(0, 0, 0))
    text_obj = bpy.context.active_object
    text_obj.data.body = text
    text_obj.data.size = 5
    text_obj.data.extrude = 0.5

    if complexity == 'high':
        text_obj.data.bevel_depth = 0.1
        text_obj.data.bevel_resolution = 4

    # Center text
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')
    text_obj.location = (0, 0, 0)

def generate_logo(svg_path, complexity, dims):
    """Import and extrude SVG logo"""
    if svg_path and os.path.exists(svg_path):
        bpy.ops.import_curve.svg(filepath=svg_path)
        for obj in bpy.context.selected_objects:
            obj.data.extrude = 0.2
            obj.data.bevel_depth = 0.05
    else:
        # Fallback to text
        generate_text("LOGO", complexity, dims)

def generate_character(complexity, dims):
    """Generate simple character (placeholder)"""
    # Simple humanoid shape
    parts = [
        ('head', 'uv_sphere', (0, 6, 0), (1, 1, 1)),
        ('body', 'cube', (0, 3, 0), (2, 3, 1)),
        ('arm_l', 'cube', (-3, 3, 0), (0.5, 2, 0.5)),
        ('arm_r', 'cube', (3, 3, 0), (0.5, 2, 0.5)),
        ('leg_l', 'cube', (-0.7, -2, 0), (0.7, 3, 0.7)),
        ('leg_r', 'cube', (0.7, -2, 0), (0.7, 3, 0.7)),
    ]

    for name, prim, loc, scale in parts:
        if prim == 'uv_sphere':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc)
        else:
            bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = scale

def generate_vehicle(complexity, dims):
    """Generate simple vehicle"""
    # Car body
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    body = bpy.context.active_object
    body.scale = (4, 1.5, 2)
    body.name = "CarBody"

    # Wheels
    for x, y in [(-2, -1.2), (2, -1.2), (-2, 1.2), (2, 1.2)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.4, location=(x, 0, y))
        wheel = bpy.context.active_object
        wheel.rotation_euler = (0, math.pi/2, 0)
        wheel.scale = (1, 1, 1)

if __name__ == "__main__":
    main()
`;

    writeFileSync(scriptPath, script, "utf-8");
  }
}

// ============================================================================
// Factory & Helper Functions
// ============================================================================

export function createBlenderRunner(config?: Partial<BlenderConfig>): BlenderRunner {
  return new BlenderRunner(config);
}

export async function exportToGLTF(
  inputPath: string,
  outputPath: string,
  options?: Partial<ExportGLTFOptions>
): Promise<BlenderResult> {
  const runner = createBlenderRunner();
  return runner.exportGLTF({
    inputPath,
    outputPath,
    format: "glb",
    applyModifiers: true,
    exportAnimation: true,
    exportMaterials: true,
    exportCameras: false,
    exportLights: false,
    selectedOnly: false,
    ...options,
  });
}

export async function bakeAnimations(
  inputPath: string,
  outputPath: string,
  options?: Partial<BakeAnimationsOptions>
): Promise<BlenderResult> {
  const runner = createBlenderRunner();
  return runner.bakeAnimations({
    inputPath,
    outputPath,
    frameStart: 1,
    frameEnd: 250,
    step: 1,
    bakeTypes: ["location", "rotation", "scale"],
    clearConstraints: true,
    clearParents: false,
    ...options,
  });
}

export async function generateBlenderAsset(
  type: GenerateAssetsOptions["type"],
  outputPath: string,
  options?: Partial<GenerateAssetsOptions>
): Promise<BlenderResult> {
  const runner = createBlenderRunner();
  return runner.generateAssets({
    type,
    outputPath,
    count: 10,
    complexity: "medium",
    style: "default",
    ...options,
  });
}

// ============================================================================
// Export
// ============================================================================

export default BlenderRunner;