
// ai agent with open ai and vercel sdk

/* import {
    Message as VercelChatMessage,
    StreamingTextResponse,
    createStreamDataTransformer
} from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables'
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const dynamic = 'force-dynamic'
export const maxDuration = 300;
export const runtime = 'edge';

const formatMessage = (message: VercelChatMessage) => {
    return `${message.role}: ${message.content}`;
};

// Adjusted template with a clear instruction
const TEMPLATE = `Answer the user's questions based only on the following context. If the answer is not in the context, reply politely that you do not have that information available.:
==============================
Context: {context}
==============================
Current conversation: {chat_history}

user: {question}
assistant:`;

// Utility function to extract relevant chunks based on keyword matching
const getRelevantChunks = (chunks: Document[], question: string, maxTokens: number = 3000) => {
    const relevantChunks = chunks.filter(chunk =>
        chunk.pageContent.toLowerCase().includes(question.toLowerCase())
    );

    // Sort by relevance (longer relevant chunks come first)
    relevantChunks.sort((a, b) => b.pageContent.length - a.pageContent.length);

    // Limit total tokens sent to avoid exceeding the token limit
    let tokenCount = 0;
    const limitedChunks: string[] = [];
    for (const chunk of relevantChunks) {
        const chunkTokens = chunk.pageContent.length / 4; // Rough estimate: 1 token ~ 4 characters
        if (tokenCount + chunkTokens > maxTokens) break;
        tokenCount += chunkTokens;
        limitedChunks.push(chunk.pageContent);
    }

    return limitedChunks.join('\n');
};

export async function POST(req: Request) {
    try {
        const { messages, documentContent } = await req.json();

        if (!documentContent) {
            return new Response(JSON.stringify({ error: "No document content provided" }), { status: 400 });
        }

        // Format conversation history
        const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
        const currentMessageContent = messages[messages.length - 1].content;

        // Create a Document object
        const doc = new Document({ pageContent: documentContent });

        // Split the document into manageable chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });
        const docs = await textSplitter.splitDocuments([doc]);

        // Select the most relevant document chunks based on the user's question
        const relevantContext = getRelevantChunks(docs, currentMessageContent);

        // Ensure relevant context was extracted
        if (!relevantContext) {
            return new Response(JSON.stringify({
                error: "Could not find relevant context from the document."
            }), { status: 400 });
        }

        const prompt = PromptTemplate.fromTemplate(TEMPLATE);

        const model = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            model: 'gpt-3.5-turbo',
            temperature: 0,
            streaming: true,
            verbose: false,
        });

        const parser = new HttpResponseOutputParser();

        // Chain to handle question, history, context, and prompt processing
        const chain = RunnableSequence.from([
            {
                question: (input) => input.question,
                chat_history: (input) => input.chat_history,
                context: (input) => input.context,
            },
            prompt,
            model,
            parser,
        ]);

        // Stream response based on the extracted context and question
        const stream = await chain.stream({
            chat_history: formattedPreviousMessages.join('\n'),
            question: currentMessageContent,
            context: relevantContext,
        });

        // Return the streaming response
        return new StreamingTextResponse(
            stream.pipeThrough(createStreamDataTransformer()),
        );
    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: "Something went wrong while processing the request." }), { status: 500 });
    }
}
 */






// ai agent with llama model using vercel sdk and GROQ provider
import { createOpenAI as createGroq } from '@ai-sdk/openai'
import { streamText, convertToCoreMessages, Message } from 'ai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { nanoid } from 'nanoid';

export const maxDuration = 300;
export const runtime = 'edge';
export const dynamic = 'force-dynamic'

const groq = createGroq({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant that answers questions based on the given context. If the answer is not in the context, politely state that you don't have that information available.`;

export async function POST(request: Request) {
    try {
        const { messages, documentContent } = await request.json();

        if (!messages || !Array.isArray(messages) || !messages.length) {
            return new Response(JSON.stringify({ error: "No messages provided or messages are not an array" }), { status: 400 });
        }

        if (documentContent && typeof documentContent !== 'string') {
            return new Response(JSON.stringify({ error: "Invalid document content" }), { status: 400 });
        }

        let context = '';
        if (documentContent) {
            const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
            const docs = await textSplitter.splitText(documentContent);
            context = docs.join('\n\n');
        }

        const chatHistory = messages.slice(0, -1).map((m: Message) => `${m.role}: ${m.content}`).join('\n');
        const currentQuestion = messages[messages.length - 1].content;

        const promptMessages: Message[] = [
            { id: nanoid(), role: 'system', content: SYSTEM_PROMPT },
            { id: nanoid(), role: 'user', content: `Context:\n${context}\n\nChat History:\n${chatHistory}\n\nQuestion: ${currentQuestion}` },
        ];

        const response = await streamText({
            model: groq('llama-3.1-70b-versatile'),
            messages: convertToCoreMessages(promptMessages),
            temperature: 0,
        });

        return response.toDataStreamResponse();
    } catch (error:any) {
        console.error('Error creating chat completion:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500 });
    }
}
