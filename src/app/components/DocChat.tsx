'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChat } from "ai/react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { v4 as uuidv4 } from 'uuid';

export function Chat() {
    const [documentContent, setDocumentContent] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<string | null>(null);
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: 'api/docss',  // Use your RAG API for document-related queries
        onError: (err) => console.error(err),
        body: { documentContent },
      initialMessages: documentContent ? [
        { id: uuidv4(), role: 'system', content: 'PDF uploaded successfully. You can now ask questions about its content.' }
      ] : [],
    });
    const chatParent = useRef<HTMLUListElement>(null);
    const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState(false); // Added state for upload error
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const domNode = chatParent.current;
        if (domNode) {
            domNode.scrollTop = domNode.scrollHeight;
        }
    });

    useEffect(() => {
        if (isLoading) {
            const statuses = ['Thinking', 'Retrieving documents', 'Analyzing content', 'Formulating response'];
            const updateStatus = () => {
                setAiStatus(statuses[Math.floor(Math.random() * statuses.length)]);
            };
            updateStatus();
            const intervalId = setInterval(updateStatus, 2000);
            return () => clearInterval(intervalId);
        } else {
            setAiStatus(null);
        }
    }, [isLoading]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedDocument(file);
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload-pdf', {
                    method: 'POST',
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    setDocumentContent(data.documentContent);  // Assuming your API returns the document content
                    setUploadSuccess(true);
                    setUploadError(false); // Reset error state on successful upload
                    setTimeout(() => setUploadSuccess(false), 3000);
                } else {
                    console.error('Upload failed');
                    setUploadError(true); // Set error state if upload fails
                }
            } catch (error) {
                console.error('Error uploading document:', error);
                setUploadError(true); // Set error state if error occurs
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();
    //     const requestBody: object = documentContent
    //         ? {
    //             documentContent,
    //             messages,
    //         }
    //         : {
    //             messages,
    //         };
    
    //     originalHandleSubmit(e, {
    //         options: {
    //             body: requestBody,
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //         },
    //     });
    // };
    

    const handleRemoveDocument = () => {
        setUploadedDocument(null);
        setDocumentContent(null);
        setUploadSuccess(false);
        setUploadError(false); // Reset error state on document removal
    };

    return (
        <main className="flex flex-col w-full h-screen max-h-dvh bg-background">
            <header className="p-4 border-b w-full max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold">AI Chat</h1>
            </header>

            <section className="p-4">
                <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-3xl mx-auto gap-4">
                    <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.txt,.doc,.docx"
                          title="Upload a file"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={handleUploadClick}>
                            Upload PDF
                        </Button>
                        {uploadedDocument && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <span>{uploadedDocument.name}</span>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleRemoveDocument}
                                    className="text-red-500"
                                >
                                    X
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input 
                            className="flex-1 min-h-[50px]" 
                            placeholder={uploadedDocument ? "Ask about the document..." : "Ask anything..."}
                            type="text" 
                            value={input} 
                            onChange={handleInputChange}
                        />
                        <Button type="submit">
                            Submit
                        </Button>
                    </div>
                </form>
                {uploadSuccess && (
                    <Alert className="mt-2 bg-green-100 border-green-400 text-green-700">
                        <AlertDescription>Document uploaded successfully!</AlertDescription>
                    </Alert>
                )}
                {uploadError && (
                    <Alert className="mt-2 bg-red-100 border-red-400 text-red-700">
                        <AlertDescription>Document upload failed!</AlertDescription>
                    </Alert>
                )}
            </section>

            <section className="container px-0 pb-10 flex flex-col flex-grow gap-4 mx-auto max-w-3xl">
                <ul ref={chatParent} className="h-1 p-4 flex-grow bg-muted/50 rounded-lg overflow-y-auto flex flex-col gap-4">
                    {messages.map((m, index) => (
                        <li key={index} className={`flex ${m.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`rounded-xl p-4 bg-background shadow-md flex ${m.role === 'assistant' ? 'w-3/4' : ''}`}>
                                <p className="text-primary">
                                    {m.role === 'assistant' && <span className="font-bold">Answer: </span>}
                                    {m.content}
                                </p>
                            </div>
                        </li>
                    ))}
                    {isLoading && (
                        <li className="flex flex-row-reverse">
                            <div className="rounded-xl p-4 bg-background shadow-md flex w-3/4">
                                <p className="text-primary">
                                    <span className="font-bold">AI: </span>
                                    {aiStatus}...
                                </p>
                            </div>
                        </li>
                    )}
                </ul>
            </section>
        </main>
    );
}
