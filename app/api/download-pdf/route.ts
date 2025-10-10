import { type NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    const lineHeight = 6
    
    // Load header and footer images and calculate their heights
    let headerImageData = null
    let footerImageData = null
    let headerHeight = 25 // Default fallback
    let footerHeight = 20 // Default fallback
    
    try {
      const headerPath = path.join(process.cwd(), "public", "Header.png")
      const footerPath = path.join(process.cwd(), "public", "Footer.png")
      
      const headerBuffer = fs.readFileSync(headerPath)
      const footerBuffer = fs.readFileSync(footerPath)
      
      headerImageData = `data:image/png;base64,${headerBuffer.toString("base64")}`
      footerImageData = `data:image/png;base64,${footerBuffer.toString("base64")}`
      
      // Get image dimensions from PNG buffer
      const getImageDimensions = (buffer: Buffer) => {
        // PNG signature check
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          // IHDR chunk starts at byte 16
          const width = buffer.readUInt32BE(16)
          const height = buffer.readUInt32BE(20)
          return { width, height }
        }
        return null
      }
      
      const headerDimensions = getImageDimensions(headerBuffer)
      const footerDimensions = getImageDimensions(footerBuffer)
      
      // Calculate height to maintain aspect ratio at full page width
      if (headerDimensions) {
        const headerAspectRatio = headerDimensions.height / headerDimensions.width
        headerHeight = pageWidth * headerAspectRatio
      }
      
      if (footerDimensions) {
        const footerAspectRatio = footerDimensions.height / footerDimensions.width
        footerHeight = pageWidth * footerAspectRatio
      }
    } catch (err) {
      console.error("Error loading header/footer images:", err)
    }
    
    // Header and footer configuration
    const contentMarginTop = headerHeight + 2 // 2mm spacing below header
    const contentMarginBottom = footerHeight // No extra spacing above footer
    
    let y = contentMarginTop

    // Function to add header and footer to current page
    const addHeaderFooter = () => {
      if (headerImageData) {
        // Position header higher to eliminate top gap (extends slightly beyond page)
        const headerY = -8 // Adjust -5 to push header up
        doc.addImage(headerImageData, "PNG", 0, headerY, pageWidth, headerHeight)
      }
      if (footerImageData) {
        // Position footer lower to eliminate bottom gap (extends slightly beyond page)
        const footerY = pageHeight - footerHeight + 10 // Adjust +5 to push footer down
        doc.addImage(footerImageData, "PNG", 0, footerY, pageWidth, footerHeight)
      }
    }

    // Add header and footer to first page
    addHeaderFooter()

    // Add main heading "Project Requirement Document" centered at the top
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    const mainTitle = "Project Requirement Document"
    const titleWidth = doc.getStringUnitWidth(mainTitle) * doc.getFontSize() / doc.internal.scaleFactor
    const titleX = (pageWidth - titleWidth) / 2
    doc.text(mainTitle, titleX, y)
    y += lineHeight * 3

    // Clean content (replace unsupported chars)
    const cleanContent = content
      .replace(/[●•○]/g, "•")
      .replace(/[""]/g, '"')
      .replace(/[']/g, "'")
      .replace(/\t/g, "    ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

    // Split into lines
    const lines = cleanContent.split("\n")
    let previousWasHeading = false
    let previousWasBullet = false
    let currentSectionLevel = 0

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()
      
      // Handle blank lines - minimal spacing to match document style
      if (!line) {
        y += lineHeight * 0.3
        continue
      }

      // Calculate indentation level
      const leadingSpaces = rawLine.length - rawLine.trimStart().length
      const indentLevel = Math.floor(leadingSpaces / 4)

      // === PRECISE HEADING DETECTION MATCHING PRD-29 ===
      // Main numbered sections (1., 2., 3., etc.)
      const isMainSection = /^(\d+)\.\s+(.+)$/.test(line) && indentLevel === 0
      
      // Subsections (1.1., 1.2., 2.1., etc.)
      const isSubSection = /^(\d+)\.(\d+)\.\s+(.+)$/.test(line)
      
      // Sub-subsections (1.1.1., 2.1.3., etc.)
      const isSubSubSection = /^(\d+)\.(\d+)\.(\d+)\.\s+(.+)$/.test(line)
      
      // Bold headers like **Role**, **Responsibilities**
      const isBoldHeader = /^\*\*([^*]+)\*\*:\s*(.*)$/.test(line)
      
      // Plain section headers (Role:, Responsibilities:, etc.)
      const isSectionHeader = /^(Role|Responsibilities|User Stories|Goals and Objectives|Use Cases|Features):\s*(.*)$/i.test(line)

      const isAnyHeading = isMainSection || isSubSection || isSubSubSection || isBoldHeader || isSectionHeader

      // === BULLET POINT DETECTION ===
      const isBullet = /^[•○●]\s/.test(line) || (/^-\s/.test(line) && !isAnyHeading)

      // Check for page break - adjusted for header/footer with tighter threshold
      if (y > pageHeight - contentMarginBottom + 10) {
        doc.addPage()
        addHeaderFooter() // Add header and footer to new page
        y = contentMarginTop
        previousWasHeading = false
        previousWasBullet = false
      }

      if (isAnyHeading) {
        // Determine section level for spacing
        let sectionLevel = 0
        if (isMainSection) sectionLevel = 1
        else if (isSubSection) sectionLevel = 2
        else if (isSubSubSection) sectionLevel = 3
        else if (isBoldHeader || isSectionHeader) sectionLevel = 4

        // Add spacing before headings - tight spacing like PRD-29
        let spacingBefore = 0
        if (isMainSection) {
          spacingBefore = previousWasHeading ? lineHeight * 1.0 : lineHeight * 1.5
        } else if (isSubSection) {
          spacingBefore = previousWasHeading ? lineHeight * 0.7 : lineHeight * 1.0
        } else if (isSubSubSection) {
          spacingBefore = previousWasHeading ? lineHeight * 0.5 : lineHeight * 0.8
        } else if (isBoldHeader || isSectionHeader) {
          spacingBefore = previousWasHeading ? lineHeight * 0.3 : lineHeight * 0.5
        }

        // Apply spacing
        if (y > contentMarginTop + (lineHeight * 3)) {
          y += spacingBefore
        }

        // Set font based on heading type - matching PRD-29 exactly
        doc.setFont("helvetica", "bold")
        if (isMainSection) {
          doc.setFontSize(12)
        } else if (isSubSection) {
          doc.setFontSize(11)
        } else if (isSubSubSection) {
          doc.setFontSize(10)
        } else if (isBoldHeader || isSectionHeader) {
          doc.setFontSize(10)
        }

        // Clean up display line
        let displayLine = line
        if (isBoldHeader) {
          displayLine = line.replace(/^\*\*([^*]+)\*\*:\s*(.*)$/, '$1: $2')
        }

        // No indentation for headers - all align to margin like PRD-29
        const headingIndent = margin

        // Split and render
        const availableWidth = maxWidth
        const wrapped = doc.splitTextToSize(displayLine, availableWidth)
        
        for (let j = 0; j < wrapped.length; j++) {
          if (y > pageHeight - contentMarginBottom + 10) {
            doc.addPage()
            addHeaderFooter() // Add header and footer to new page
            y = contentMarginTop
          }
          doc.text(wrapped[j], headingIndent, y)
          y += lineHeight
        }
        
        // Minimal spacing after headings - tight like PRD-29
        if (isMainSection) {
          y += lineHeight * 0.5
        } else if (isSubSection) {
          y += lineHeight * 0.3
        } else if (isSubSubSection) {
          y += lineHeight * 0.2
        } else {
          y += lineHeight * 0.2
        }
        
        previousWasHeading = true
        previousWasBullet = false
        currentSectionLevel = sectionLevel
        continue
      }
      
      // === BULLET POINTS ===
      else if (isBullet) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)

        // Tight spacing before bullets - no extra space
        if (!previousWasBullet && !previousWasHeading) {
          y += lineHeight * 0.1
        }

        // Calculate indent - tight spacing like PRD-29
        const baseIndent = margin + (indentLevel * 15)
        
        // Clean bullet symbol
        let bulletText = line
        if (isBullet) {
          bulletText = line.replace(/^[•○●-]\s*/, "• ")
        }

        const availableWidth = maxWidth - (baseIndent - margin)
        const wrapped = doc.splitTextToSize(bulletText, availableWidth)
        
        for (let j = 0; j < wrapped.length; j++) {
          if (y > pageHeight - contentMarginBottom + 10) {
            doc.addPage()
            addHeaderFooter() // Add header and footer to new page
            y = contentMarginTop
          }
          
          // Hanging indent for wrapped lines
          const currentIndent = j === 0 ? baseIndent : baseIndent + 10
          doc.text(wrapped[j], currentIndent, y)
          y += lineHeight
        }
        
        // No extra spacing between bullets
        previousWasHeading = false
        previousWasBullet = true
        continue
      }
      
      // === INDENTED TEXT ===
      else if (indentLevel > 0) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        
        const textIndent = margin + (indentLevel * 15)
        const availableWidth = maxWidth - (textIndent - margin)
        const wrapped = doc.splitTextToSize(line, availableWidth)
        
        for (const part of wrapped) {
          if (y > pageHeight - contentMarginBottom + 10) {
            doc.addPage()
            addHeaderFooter() // Add header and footer to new page
            y = contentMarginTop
          }
          doc.text(part, textIndent, y)
          y += lineHeight
        }
        
        previousWasHeading = false
        previousWasBullet = false
        continue
      }
      
      // === NORMAL PARAGRAPH TEXT ===
      else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        
        // Minimal paragraph spacing like PRD-29
        if (!previousWasHeading && !previousWasBullet) {
          y += lineHeight * 0.2
        }
        
        const wrapped = doc.splitTextToSize(line, maxWidth)

        for (const part of wrapped) {
          if (y > pageHeight - contentMarginBottom + 10) {
            doc.addPage()
            addHeaderFooter() // Add header and footer to new page
            y = contentMarginTop
          }
          doc.text(part, margin, y)
          y += lineHeight
        }
        
        // Minimal spacing after paragraphs
        y += lineHeight * 0.1
        
        previousWasHeading = false
        previousWasBullet = false
      }
    }

    const pdfBuffer = doc.output("arraybuffer")

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="PRD-Document.pdf"',
      },
    })
  } catch (err) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}