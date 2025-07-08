import healpy as hp
import numpy as np
import json
from typing import Dict, List, Tuple

def generate_healpix_data(save_path: str, nside: int = 16, cubemap_resolution: int = 90) -> Dict[str, any]:
    """
    Generate HEALPix pixelation data including cubemap projection and adjacency graph.
    
    Args:
        nside: HEALPix resolution parameter (must be power of 2)
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
    
    print(len(face_grids[0]))

    # Save all data to JSON
    save_data = {
        "nside": nside,
        "npix": npix,
        "cubemap": cubemap_data,
        "adjacency": adjacency_graph,
        "faceGrids": face_grids,
        "gridSize": cubemap_resolution,
    }
    
    with open(save_path, 'w') as f:
        json.dump(save_data, f, indent=2)
    
    print(f"Generated HEALPix data with {npix} pixels & cubemap resolution {cubemap_resolution}.")
    print(f"Saved to {save_path}")
    
    return save_data