import healpy as hp
import numpy as np
import json
from typing import Dict, List, Tuple
import math

def precompute_raycast_data(save_path: str | None = None, nside: int = 16, cubemap_resolution: int = 90, sphere_radius: int = 50) -> Dict[str, any]:
    """
    Precompute HEALPix pixelation and other useful raycast data including cubemap projection, adjacency graph, occlusion data, etc.
    
    Args:
        save_path: Path to save the precomputed data as JSON. If None, data will not be saved.
        nside: HEALPix resolution parameter (must be power of 2)
        cubemap_resolution: Resolution for cubemap lookup grid
        sphere_radius: Radius for occlusion calculations
    """
    npix = hp.nside2npix(nside)
    
    # Generate cubemap projection data
    # For each pixel, store its center vector for fast lookup
    cubemap_data = {}
    
    for pix in range(npix):
        # Get the unit vector pointing to the center of this pixel
        vec = hp.pix2vec(nside, pix, nest=True)
        
        # Convert to face and coordinates for cubemap
        # HEALPix uses 12 base pixels arranged in a specific pattern
        # We'll store the mapping from direction to pixel
        x, y, z = vec
        
        # Determine which cube face this vector is closest to
        abs_x, abs_y, abs_z = abs(x), abs(y), abs(z)
        
        if abs_x >= abs_y and abs_x >= abs_z:
            face = 0 if x > 0 else 1
            u = -z/abs_x if x > 0 else z/abs_x
            v = y/abs_x
        elif abs_y >= abs_x and abs_y >= abs_z:
            face = 2 if y > 0 else 3
            u = x/abs_y
            v = -z/abs_y if y > 0 else z/abs_y
        else:
            face = 4 if z > 0 else 5
            u = x/abs_z
            v = y/abs_z
        
        # Normalize u,v to [0,1] range
        u = (u + 1) * 0.5
        v = (v + 1) * 0.5
        
        cubemap_data[str(pix)] = {
            "face": face,
            "u": u,
            "v": v,
            "center": [float(x), float(y), float(z)]
        }
    
    # Generate adjacency graph
    adjacency_graph = {}
    
    for pix in range(npix):
        # Get all neighbors (including diagonal)
        neighbors = hp.get_all_neighbours(nside, pix, nest=True)
        
        # Filter to only include valid neighbors (not -1) and only edge-sharing neighbors
        # HEALPix returns 8 neighbors: 4 edge-sharing and 4 corner-sharing
        # We want only the 4 edge-sharing neighbors (indices 0, 2, 4, 6)
        edge_neighbors = []
        for i in [0, 2, 4, 6]:
            if i < len(neighbors) and neighbors[i] != -1:
                edge_neighbors.append(int(neighbors[i]))
        
        adjacency_graph[str(pix)] = edge_neighbors
    
    
    # Create lookup structure for efficient direction-to-pixel mapping
    # We'll create a grid-based lookup for each cube face
    # For each grid cell, find the pixel that contains its center
    face_grids: list[dict[str, int]] = [{} for _ in range(6)]
    for face in range(6):
        for u in range(cubemap_resolution):
            for v in range(cubemap_resolution):
                # Convert grid cell center to direction vector
                u_center = (u + 0.5) / cubemap_resolution
                v_center = (v + 0.5) / cubemap_resolution
                
                # Convert from [0,1] to [-1,1]
                u_norm = u_center * 2 - 1
                v_norm = v_center * 2 - 1
                
                # Convert from cube face UV to 3D direction
                if face == 0:  # +X
                    x, y, z = 1.0, v_norm, -u_norm
                elif face == 1:  # -X
                    x, y, z = -1.0, v_norm, u_norm
                elif face == 2:  # +Y
                    x, y, z = u_norm, 1.0, -v_norm
                elif face == 3:  # -Y
                    x, y, z = u_norm, -1.0, v_norm
                elif face == 4:  # +Z
                    x, y, z = u_norm, v_norm, 1.0
                else:  # -Z
                    x, y, z = u_norm, v_norm, -1.0
                
                # Normalize to unit vector
                length = np.sqrt(x*x + y*y + z*z)
                x, y, z = x/length, y/length, z/length
                
                # Find the pixel containing this direction
                pix_id = hp.vec2pix(nside, x, y, z, nest=True)
                
                grid_key = f"{u},{v}"
                face_grids[face][grid_key] = int(pix_id)
    
    print(f"Generated cubemap grids with {len(face_grids[0])} entries per face")

    # Calculate occlusion data
    print(f"Calculating occlusion data for sphere radius {sphere_radius}...")
    
    # Create mapping from pixel ID to its direction vectors for efficient lookup
    pixel_to_directions = {}
    for pix in range(npix):
        vec = hp.pix2vec(nside, pix, nest=True)
        pixel_to_directions[pix] = vec
    
    # Calculate occlusions for each voxel position
    voxels_to_occlusion_radii = {}
    voxels_to_occluded_regions = {}
    
    processed_voxels = 0
    
    for x_offset in range(-sphere_radius, sphere_radius + 1):
        for y_offset in range(-sphere_radius, sphere_radius + 1):
            for z_offset in range(-sphere_radius, sphere_radius + 1):
                # Skip origin voxel (bot's position)
                if x_offset == 0 and y_offset == 0 and z_offset == 0:
                    continue
                
                # Calculate distance from origin
                distance = math.sqrt(x_offset**2 + y_offset**2 + z_offset**2)
                
                # Only consider voxels within sphere radius
                if distance > sphere_radius:
                    continue
                
                processed_voxels += 1
                if processed_voxels % 10000 == 0:
                    print(f"Processed {processed_voxels} voxels...")
                
                voxel_key = f"{x_offset},{y_offset},{z_offset}"
                
                # Calculate angular occlusion radius (approximate voxel as sphere with radius 0.495)
                angular_occlusion_radius = math.atan(0.495 / distance)
                voxels_to_occlusion_radii[voxel_key] = angular_occlusion_radius
                
                # Get the orientation that points toward this voxel's center
                # Normalize the voxel offset vector
                voxel_length = math.sqrt(x_offset**2 + y_offset**2 + z_offset**2)
                center_x = x_offset / voxel_length
                center_y = y_offset / voxel_length
                center_z = z_offset / voxel_length
                
                # Find regions that would be wholly occluded by this voxel
                occluded_regions = []
                
                # Check each pixel/region
                for pix in range(npix):
                    vec = pixel_to_directions[pix]
                    
                    # Calculate angular distance between this pixel's direction and voxel center
                    # Using dot product: cos(angle) = dot(v1, v2) / (|v1| * |v2|)
                    # Since both vectors are unit vectors: cos(angle) = dot(v1, v2)
                    dot_product = vec[0] * center_x + vec[1] * center_y + vec[2] * center_z
                    
                    # Clamp dot product to [-1, 1] to handle floating point errors
                    dot_product = max(-1.0, min(1.0, dot_product))
                    
                    # Calculate angular distance
                    angular_distance = math.acos(dot_product)
                    
                    # If this pixel is within the occlusion radius, mark it as occluded
                    if angular_distance <= angular_occlusion_radius:
                        occluded_regions.append(pix)
                
                voxels_to_occluded_regions[voxel_key] = occluded_regions
    
    print(f"Processed {processed_voxels} voxels for occlusion calculations")
    print(f"Generated occlusion data for {len(voxels_to_occluded_regions)} voxel positions")

    data = { # Must match the expected structure in the the typescript code that reads this file
        "healpixData": {
            "nside": nside,
            "npix": npix,
            "sphereRadius": sphere_radius,
            "cubemap": cubemap_data,
            "adjacency": adjacency_graph,
            "faceGrids": face_grids,
            "gridSize": cubemap_resolution,
        },
        "voxelsToOcclusionRadii": voxels_to_occlusion_radii,
        "voxelsToOccludedRegions": voxels_to_occluded_regions,
    }

    if save_path is not None:
        with open(save_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    print(f"Generated HEALPix data with {npix} pixels & cubemap resolution {cubemap_resolution}.")
    print(f"Saved to {save_path}")
    
    return data