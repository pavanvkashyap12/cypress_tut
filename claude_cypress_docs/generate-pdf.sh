#!/bin/bash

# SnapLogic Cypress Framework - PDF Generation Script
# This script converts all markdown documentation to a single PDF

echo "📄 Generating PDF from Cypress Framework Documentation..."

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "❌ Pandoc is not installed!"
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install pandoc"
    echo "  Ubuntu:  sudo apt-get install pandoc"
    echo "  Windows: choco install pandoc"
    echo ""
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Output filename
OUTPUT_FILE="SnapLogic_Cypress_Framework_Complete_Analysis.pdf"

echo "📂 Working directory: $SCRIPT_DIR"
echo "📝 Combining markdown files..."

# Convert all markdown files to a single PDF
pandoc \
    01_Framework_Overview.md \
    02_Design_Patterns.md \
    03_Authentication_Strategy.md \
    04_Environment_Parallel_Reporting.md \
    05_CICD_Analysis_Interview.md \
    -o "$OUTPUT_FILE" \
    --pdf-engine=xelatex \
    --toc \
    --toc-depth=3 \
    --number-sections \
    -V geometry:margin=1in \
    -V fontsize=11pt \
    -V colorlinks=true \
    -V linkcolor=blue \
    -V urlcolor=blue \
    --metadata title="SnapLogic Cypress Framework - Complete Analysis" \
    --metadata author="QA Automation Framework Documentation" \
    --metadata date="February 2025" \
    --highlight-style=tango

# Check if PDF was generated successfully
if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ PDF generated successfully!"
    echo "📄 File: $SCRIPT_DIR/$OUTPUT_FILE"
    echo ""

    # Get file size
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "📊 File size: $FILE_SIZE"

    # Count pages (if pdfinfo is available)
    if command -v pdfinfo &> /dev/null; then
        PAGE_COUNT=$(pdfinfo "$OUTPUT_FILE" | grep Pages | awk '{print $2}')
        echo "📖 Total pages: $PAGE_COUNT"
    fi

    echo ""
    echo "🎉 Done! Open the PDF with:"
    echo "   open '$OUTPUT_FILE'  (macOS)"
    echo "   xdg-open '$OUTPUT_FILE'  (Linux)"
    echo "   start '$OUTPUT_FILE'  (Windows)"
else
    echo "❌ Failed to generate PDF"
    exit 1
fi
