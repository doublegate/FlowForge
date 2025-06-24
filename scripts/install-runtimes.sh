#!/bin/bash
# Install all required Flatpak runtimes for FlowForge

echo "Installing FlowForge Flatpak runtimes..."
echo ""

# Add Flathub if not present
if ! flatpak remote-list | grep -q flathub; then
    echo "Adding Flathub repository..."
    flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
fi

# Install runtimes
RUNTIMES=(
    "org.freedesktop.Platform//23.08"
    "org.freedesktop.Sdk//23.08"
    "org.freedesktop.Sdk.Extension.node18//23.08"
    "org.electronjs.Electron2.BaseApp//23.08"
)

for runtime in "${RUNTIMES[@]}"; do
    echo "Installing $runtime..."
    flatpak install -y flathub "$runtime"
done

echo ""
echo "✓ All runtimes installed!"