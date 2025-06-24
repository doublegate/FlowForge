#!/usr/bin/env python3
"""
Simplified flatpak-node-generator for FlowForge
This generates offline sources for npm packages from package-lock.json
"""

import json
import sys
import argparse
import hashlib
import urllib.request
import urllib.parse

def get_sha512(url):
    """Download and calculate SHA512 for a URL"""
    try:
        with urllib.request.urlopen(url) as response:
            data = response.read()
            return hashlib.sha512(data).hexdigest()
    except Exception as e:
        print(f"Warning: Could not download {url}: {e}")
        return None

def process_package_lock(package_lock_path):
    """Process package-lock.json and generate sources"""
    with open(package_lock_path, 'r') as f:
        data = json.load(f)
    
    sources = []
    
    # Process lockfileVersion 2 or 3 format
    if 'packages' in data:
        for name, info in data['packages'].items():
            if name == "" or not info.get('resolved'):
                continue
            
            url = info['resolved']
            integrity = info.get('integrity', '')
            
            # Extract SHA from integrity field
            if integrity.startswith('sha512-'):
                sha512 = integrity[7:].replace('/', '').replace('+', '-').replace('=', '')
                sha512 = sha512.ljust((len(sha512) + 3) // 4 * 4, '=')
                # Convert base64 to hex
                import base64
                sha512_hex = base64.b64decode(sha512).hex()
            else:
                # Download and calculate SHA512
                sha512_hex = get_sha512(url)
                if not sha512_hex:
                    continue
            
            source = {
                "type": "file",
                "url": url,
                "sha512": sha512_hex
            }
            
            # Add destination filename
            if name.startswith('node_modules/'):
                dest_name = name[13:]  # Remove 'node_modules/' prefix
            else:
                dest_name = urllib.parse.urlparse(url).path.split('/')[-1]
            
            source["dest-filename"] = f"npm-cache/{dest_name}"
            sources.append(source)
    
    # Also process dependencies for older format
    elif 'dependencies' in data:
        def process_deps(deps, prefix=''):
            for name, info in deps.items():
                if isinstance(info, dict) and 'resolved' in info:
                    url = info['resolved']
                    integrity = info.get('integrity', '')
                    
                    if integrity.startswith('sha512-'):
                        sha512 = integrity[7:]
                        # Convert base64 to hex (simplified)
                        sha512_hex = sha512  # This would need proper conversion
                    else:
                        sha512_hex = get_sha512(url)
                        if not sha512_hex:
                            continue
                    
                    source = {
                        "type": "file",
                        "url": url,
                        "sha512": sha512_hex,
                        "dest-filename": f"npm-cache/{url.split('/')[-1]}"
                    }
                    sources.append(source)
                    
                    # Process nested dependencies
                    if 'dependencies' in info:
                        process_deps(info['dependencies'], f"{prefix}{name}/")
        
        process_deps(data['dependencies'])
    
    return sources

def main():
    parser = argparse.ArgumentParser(description='Generate Flatpak sources from package-lock.json')
    parser.add_argument('type', choices=['npm'], help='Package manager type')
    parser.add_argument('lockfile', help='Path to package-lock.json')
    parser.add_argument('-o', '--output', required=True, help='Output JSON file')
    
    args = parser.parse_args()
    
    if args.type != 'npm':
        print("Only npm is supported")
        sys.exit(1)
    
    print(f"Processing {args.lockfile}...")
    sources = process_package_lock(args.lockfile)
    
    # Write output
    with open(args.output, 'w') as f:
        json.dump(sources, f, indent=2)
    
    print(f"Generated {len(sources)} sources in {args.output}")

if __name__ == '__main__':
    main()