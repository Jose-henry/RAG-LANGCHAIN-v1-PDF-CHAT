// LANGCHAIN WITH RAG
import { NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

export async function POST(request: Request) {
  const formData = await request.formData();
  const pdfFile = formData.get('file') as File;

  if (!pdfFile) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  try {
    // Load PDF content using PDFLoader
    const arrayBuffer = await pdfFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: pdfFile.type });
    const loader = new PDFLoader(blob); // Use Blob to handle the file in memory
    const docs = await loader.load();

    const documentContent = docs.map((doc: any) => doc.pageContent).join('\n\n');

    return NextResponse.json({ documentContent }, { status: 200 });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: 'Error processing PDF' }, { status: 500 });
  }
}
