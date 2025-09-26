import { type NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"

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
    let y = margin

    // Add main heading "Project Requirement Document" centered at the top
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    const mainTitle = "Project Requirement Document"
    const titleWidth = doc.getStringUnitWidth(mainTitle) * doc.getFontSize() / doc.internal.scaleFactor
    const titleX = (pageWidth - titleWidth) / 2
    doc.text(mainTitle, titleX, y)
    y += lineHeight * 3 // Add space after main title

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

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()
      
      if (!line) {
        y += lineHeight * 0.7 // Reduced spacing for blank lines
        continue
      }

      // Calculate indentation level
      const leadingSpaces = rawLine.length - rawLine.trimStart().length
      const indentLevel = Math.floor(leadingSpaces / 4)

      // === ENHANCED HEADING DETECTION ===
      // Main numbered sections (1., 2., 3., etc.) - Top level
      const isMainSection = /^\d+\.\s/.test(line)
      
      // Subsections (1.1., 1.2., 2.1., etc.) - Second level
      const isSubSection = /^\d+\.\d+\.\s/.test(line)
      
      // Sub-subsections (1.1.1., 2.1.3., etc.) - Third level
      const isSubSubSection = /^\d+\.\d+\.\d+\.\s/.test(line)
      
      // Hash headings (# ## ### etc.)
      const isHashHeading = /^#{1,6}\s/.test(line)
      
      // All caps headings
      const isAllCapsHeading = /^[A-Z][A-Z\s\d\-_:()]{2,}$/.test(line) && line.length < 100
      
      // Bold markdown headings
      const isBoldHeading = /^\*\*.*\*\*$/.test(line)
      
      // Special section identifiers (like Role:, Description:, etc.)
      const isSectionHeader = /^(Role|Description|Responsibilities|User Stories|Goals and Objectives|Requirements|Feature|Objective|Actors Involved|Preconditions|Main Flow|Postconditions|Key Components|Action Items|Duration|Summary|Next Steps|Use Cases|Features):/i.test(line)

      const isAnyHeading = isMainSection || isSubSection || isSubSubSection || isHashHeading || isAllCapsHeading || isBoldHeading || isSectionHeader

      // === BULLET POINT DETECTION ===
      const isBullet = /^[•○●]\s/.test(line) || /^-\s/.test(line)
      const isNumberedItem = /^\d+\.\s/.test(line) && !isMainSection && !isSubSection && !isSubSubSection

      // Check for page break
      if (y > pageHeight - margin - 10) {
        doc.addPage()
        y = margin
      }

      if (isAnyHeading) {
        // Add spacing before headings (reduced spacing)
        if (y > margin + (lineHeight * 2)) { // Account for main title space
          if (isMainSection) {
            y += lineHeight * 1.0 // Reduced from 1.5
          } else if (isSubSection || isSubSubSection) {
            y += lineHeight * 0.4 // Much smaller spacing for subsections
          } else {
            y += lineHeight * 1.0
          }
        }

        // Set font based on heading type
        doc.setFont("helvetica", "bold")
        
        if (isMainSection) {
          doc.setFontSize(14)
          // No extra space before main sections since we handle it above
        } else if (isSubSection) {
          doc.setFontSize(12)
          // No extra space before subsections since we handle it above
        } else if (isSubSubSection) {
          doc.setFontSize(11)
        } else if (isHashHeading) {
          const hashCount = (line.match(/^#+/) || [''])[0].length
          doc.setFontSize(16 - hashCount * 1.5)
        } else if (isAllCapsHeading) {
          doc.setFontSize(11)
        } else if (isSectionHeader) {
          doc.setFontSize(10)
        } else {
          doc.setFontSize(12)
        }

        // Clean up the line for display
        let displayLine = line
        if (isHashHeading) {
          displayLine = line.replace(/^#+\s*/, '')
        } else if (isBoldHeading) {
          displayLine = line.replace(/^\*\*(.*)\*\*$/, '$1')
        }

        // Apply proper indentation for subsections
        let headingIndent = margin
        if (isSubSection) {
          headingIndent = margin + 8
        } else if (isSubSubSection) {
          headingIndent = margin + 16
        } else if (isSectionHeader) {
          headingIndent = margin + (indentLevel * 12)
        }

        // Split text and render with word wrap
        const wrapped = doc.splitTextToSize(displayLine, maxWidth - (headingIndent - margin))
        
        for (const part of wrapped) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(part, headingIndent, y)
          y += lineHeight
        }
        
        // Add spacing after headings
        if (isMainSection || isSubSection) {
          y += lineHeight * 0.8
        } else {
          y += lineHeight * 0.4
        }
        continue
      }
      
      //  Bullet points and numbered items
      else if (isBullet || isNumberedItem) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)

        // Calculate indent based on nesting level
        const baseIndent = margin + 12 + (indentLevel * 12)
        
        // Clean bullet symbol
        let bulletText = line
        if (isBullet) {
          bulletText = line.replace(/^[•○●-]\s/, "• ")
        }

        const availableWidth = maxWidth - (baseIndent - margin)
        const wrapped = doc.splitTextToSize(bulletText, availableWidth)
        
        for (let j = 0; j < wrapped.length; j++) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          
          // Hanging indent for continuation lines
          const currentIndent = j === 0 ? baseIndent : baseIndent + 8
          doc.text(wrapped[j], currentIndent, y)
          y += lineHeight
        }
        continue
      }
      
      // === INDENTED TEXT (like under bullet points or subsections) ===
      else if (indentLevel > 0) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        
        const textIndent = margin + (indentLevel * 12)
        const availableWidth = maxWidth - (textIndent - margin)
        const wrapped = doc.splitTextToSize(line, availableWidth)
        
        for (const part of wrapped) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(part, textIndent, y)
          y += lineHeight
        }
        continue
      }
      
      // === NORMAL TEXT ===
      else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        
        const wrapped = doc.splitTextToSize(line, maxWidth)

        for (const part of wrapped) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(part, margin, y)
          y += lineHeight
        }
        
        // Add small spacing after paragraphs
        y += lineHeight * 0.2
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