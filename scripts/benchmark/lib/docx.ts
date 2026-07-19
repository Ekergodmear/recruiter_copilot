import JSZip from "jszip";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function documentXml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}

/** Synthetic DOCX for import benchmarks (unique content per index). */
export async function createBenchmarkDocx(index: number): Promise<Buffer> {
  const zip = new JSZip();
  const lines = [
    `Benchmark Candidate ${index}`,
    `bench${index}@example.com`,
    "+84 900 000 " + String(index).padStart(4, "0"),
    "Senior Software Engineer",
    "Skills: TypeScript, React, Node.js, PostgreSQL",
    "English: B2",
    "5 years of experience",
    `Unique token ${index}-${Date.now()}`,
  ];
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/document.xml", documentXml(lines.join("\n")));
  return zip.generateAsync({ type: "nodebuffer" });
}
