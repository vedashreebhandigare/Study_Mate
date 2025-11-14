import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  BookOpen, 
  MessageCircle, 
  Send, 
  Sparkles, 
  FileText,
  Trash2,
  Loader2,
  BookMarked,
  Brain,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateTutorResponse, 
  TutorMode, 
  TutorMessage, 
  DocumentContext,
  EXAMPLE_PROMPTS_GENERAL,
  EXAMPLE_PROMPTS_FOCUSED,
} from '../lib/ai-tutor';
import { 
  getUserDocuments, 
  createTutorChat,
  getUserTutorChats,
  clearTutorChatHistory,
  type Document,
  type TutorChat,
} from '../lib/database';
import { downloadFile } from '../lib/storage';
import { FileProcessor } from '../lib/file-processor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AITutorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

// Code Block Component with Copy Functionality
function CodeBlock({ 
  inline, 
  className, 
  children, 
  ...props 
}: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-slate-800/70 px-2 py-0.5 rounded text-purple-300 border border-purple-500/20" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4">
      {/* Language Label & Copy Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border border-purple-500/30 border-b-0 rounded-t-lg">
        {language && (
          <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {language.toUpperCase()}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="rounded-b-lg overflow-hidden border border-purple-500/30 border-t-0">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          showLineNumbers={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.8)',
            fontSize: '0.875rem',
          }}
          lineNumberStyle={{
            color: 'rgba(139, 92, 246, 0.4)',
            paddingRight: '1rem',
            minWidth: '2.5rem',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function AITutor({ isOpen, onClose, userId }: AITutorProps) {
  const [mode, setMode] = useState<TutorMode>('general');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load documents and chat history
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      loadChatHistory();
    }
  }, [isOpen, userId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadDocuments = async () => {
    const { data } = await getUserDocuments(userId);
    if (data) {
      setDocuments(data);
    }
  };

  const loadChatHistory = async () => {
    const { data } = await getUserTutorChats(userId, 100);
    if (data) {
      // Convert database records to TutorMessage format
      const chatMessages: TutorMessage[] = [];
      data.reverse().forEach(chat => {
        chatMessages.push({
          id: `${chat.id}-user`,
          role: 'user',
          content: chat.message,
          mode: chat.mode,
          documentName: chat.document_name,
          timestamp: new Date(chat.created_at),
        });
        chatMessages.push({
          id: chat.id,
          role: 'assistant',
          content: chat.response,
          mode: chat.mode,
          documentName: chat.document_name,
          timestamp: new Date(chat.created_at),
          citations: chat.citations || [],
        });
      });
      setMessages(chatMessages);
    }
  };

  const loadDocumentContent = async (documentId: string) => {
    setIsLoadingDocument(true);
    try {
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;

      // Download file from Supabase storage
      const fileBlob = await downloadFile(document.file_path);
      if (!fileBlob) {
        throw new Error('Failed to download document');
      }

      // Process file to extract text
      const file = new File([fileBlob], document.name);
      const processed = await FileProcessor.processFile(file);
      const extractedText = processed.text;

      setDocumentContext({
        id: document.id,
        name: document.name,
        content: extractedText,
      });
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleModeToggle = async () => {
    if (mode === 'general') {
      if (documents.length === 0) {
        alert('📚 Please upload a document first!\n\nDocument Focus Mode requires an uploaded PDF/DOCX/TXT file. Go to the Documents card to upload one.');
        return;
      }
      setMode('focused');
    } else {
      setMode('general');
      setSelectedDocument(null);
      setDocumentContext(null);
    }
  };

  const handleDocumentSelect = async (documentId: string) => {
    setSelectedDocument(documentId);
    await loadDocumentContent(documentId);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (mode === 'focused' && !documentContext) {
      alert('Please select a document first');
      return;
    }

    const userMessage: TutorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      mode,
      documentName: documentContext?.name,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const { response, citations } = await generateTutorResponse(
        inputMessage,
        mode,
        messages,
        documentContext || undefined
      );

      const assistantMessage: TutorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        mode,
        documentName: documentContext?.name,
        timestamp: new Date(),
        citations,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to database
      await createTutorChat({
        user_id: userId,
        message: inputMessage,
        response,
        mode,
        document_id: documentContext?.id,
        document_name: documentContext?.name,
        citations,
      });
    } catch (error: any) {
      const errorMessage: TutorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${error.message}. Please try again.`,
        mode,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      await clearTutorChatHistory(userId);
      setMessages([]);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  const examplePrompts = mode === 'general' 
    ? EXAMPLE_PROMPTS_GENERAL 
    : EXAMPLE_PROMPTS_FOCUSED;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-3xl p-0 bg-gradient-to-br from-purple-950/95 via-slate-950/95 to-blue-950/95 border-purple-500/20"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <SheetTitle className="text-2xl text-white">AI Tutor</SheetTitle>
                  <SheetDescription className="text-sm text-purple-300/70">
                    {mode === 'general' 
                      ? 'General AI Assistant' 
                      : 'Document Focus Mode'}
                  </SheetDescription>
                </div>
              </div>
              
              <Button
                onClick={handleClearHistory}
                variant="ghost"
                size="sm"
                className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            </div>

            {/* Mode Toggle & Document Selector */}
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={handleModeToggle}
                className={`w-full justify-center gap-2 transition-all ${
                  mode === 'focused'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
                }`}
              >
                {mode === 'focused' ? (
                  <>
                    🔄 Reset to General Tutor
                  </>
                ) : (
                  <>
                    📚 Focus on This Document
                  </>
                )}
              </Button>

              {mode === 'focused' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <Select
                    value={selectedDocument || ''}
                    onValueChange={handleDocumentSelect}
                  >
                    <SelectTrigger className="w-full bg-slate-900/50 border-purple-500/30 text-white">
                      <SelectValue placeholder="Select a document..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-purple-500/30">
                      {documents.length === 0 ? (
                        <div className="p-4 text-center text-purple-300/70">
                          No documents uploaded yet
                        </div>
                      ) : (
                        documents.map(doc => (
                          <SelectItem 
                            key={doc.id} 
                            value={doc.id}
                            className="text-white hover:bg-purple-500/20"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-400" />
                              <span className="truncate">{doc.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {documentContext && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-2 border-purple-500/40 shadow-lg shadow-purple-500/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-purple-500/30 mt-0.5">
                          <BookMarked className="w-4 h-4 text-purple-200" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-purple-300/70 mb-1">
                            📚 Document Focus Mode Active
                          </div>
                          <div className="text-sm text-white">
                            <span className="text-purple-300">Focused on:</span>{' '}
                            <span className="font-semibold">{documentContext.name}</span>
                          </div>
                          <div className="text-xs text-purple-300/60 mt-1">
                            All responses will cite specific sections, figures, and tables from this document.
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isLoadingDocument && (
                    <div className="flex items-center gap-2 text-sm text-purple-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading document content...
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <div className="min-h-full">
                {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20"
                >
                  {mode === 'general' ? (
                    <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  ) : (
                    <BookMarked className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  )}
                  <h3 className="text-xl text-white mb-2">
                    {mode === 'general' 
                      ? 'Ask me anything!' 
                      : 'Ready to explore your document'}
                  </h3>
                  <p className="text-purple-300/70 max-w-md">
                    {mode === 'general'
                      ? 'I can help with IoT, cybersecurity, deep learning, and more.'
                      : 'I\'ll answer questions using only content from your document, with citations to specific sections, figures, tables, and equations.'}
                  </p>
                  {mode === 'focused' && (
                    <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 max-w-md">
                      <p className="text-xs text-purple-300/80">
                        ✨ <strong>Pedagogical Mode:</strong> Responses will include tables, bullet points, figure references, and equation breakdowns based on your query.
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Example Prompts */}
                <div className="w-full max-w-2xl space-y-2">
                  <p className="text-sm text-purple-300/70">Try asking:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {examplePrompts.slice(0, 3).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExamplePrompt(prompt)}
                        className="p-3 text-left text-sm rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-200 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                <AnimatePresence>
                  {messages.map((message, idx) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'bg-slate-900/50 border border-purple-500/20 text-purple-100'
                        }`}
                      >
                        {message.documentName && (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-500/20">
                            <FileText className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-purple-300/70">
                              {message.documentName}
                            </span>
                          </div>
                        )}
                        
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // Code blocks with syntax highlighting
                              code: CodeBlock,

                              // Tables - Glassmorphic styling
                              table: ({ children }) => (
                                <div className="my-4 overflow-x-auto">
                                  <table className="w-full border-collapse rounded-lg overflow-hidden border border-purple-500/30">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 border-b-2 border-purple-500/50">
                                  {children}
                                </thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="divide-y divide-purple-500/20">
                                  {children}
                                </tbody>
                              ),
                              tr: ({ children, ...props }) => {
                                // Check if this is a header row or body row
                                const isHeader = props.node?.tagName === 'tr' && 
                                  props.node?.position?.start?.line === props.node?.position?.end?.line;
                                return (
                                  <tr 
                                    className={`
                                      transition-colors duration-200
                                      ${!isHeader ? 'hover:bg-purple-500/10 even:bg-purple-500/5' : ''}
                                    `}
                                  >
                                    {children}
                                  </tr>
                                );
                              },
                              th: ({ children }) => (
                                <th className="px-4 py-3 text-left text-purple-200 border-r border-purple-500/20 last:border-r-0">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-4 py-3 text-purple-100/90 border-r border-purple-500/20 last:border-r-0">
                                  {children}
                                </td>
                              ),

                              // Lists - Custom styled
                              ul: ({ children }) => (
                                <ul className="space-y-2 my-3 pl-6">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="space-y-2 my-3 pl-6 list-decimal">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-purple-100/90 marker:text-purple-400">
                                  <span className="ml-2">{children}</span>
                                </li>
                              ),

                              // Headings - Gradient styling
                              h1: ({ children }) => (
                                <h1 className="text-2xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 mt-4">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 mt-3">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 mt-3">
                                  {children}
                                </h3>
                              ),
                              h4: ({ children }) => (
                                <h4 className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 mt-2">
                                  {children}
                                </h4>
                              ),
                              h5: ({ children }) => (
                                <h5 className="text-sm bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 mt-2">
                                  {children}
                                </h5>
                              ),
                              h6: ({ children }) => (
                                <h6 className="text-xs bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 mt-2">
                                  {children}
                                </h6>
                              ),

                              // Blockquote - Purple bordered
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-purple-500 bg-purple-500/10 pl-4 py-2 my-3 italic text-purple-200/80">
                                  {children}
                                </blockquote>
                              ),

                              // Links - Purple hover
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50 hover:decoration-purple-400 transition-colors"
                                >
                                  {children}
                                </a>
                              ),

                              // Paragraphs - Proper spacing
                              p: ({ children }) => (
                                <p className="my-2 text-purple-100/90 leading-relaxed">
                                  {children}
                                </p>
                              ),

                              // Strong/Bold - Highlighted
                              strong: ({ children }) => (
                                <strong className="text-purple-300 bg-purple-500/20 px-1 rounded">
                                  {children}
                                </strong>
                              ),

                              // Emphasis/Italic
                              em: ({ children }) => (
                                <em className="text-purple-200 italic">
                                  {children}
                                </em>
                              ),

                              // Horizontal Rule
                              hr: () => (
                                <hr className="my-4 border-t border-purple-500/30" />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-500/20">
                            <div className="flex flex-wrap gap-1">
                              {message.citations.map((citation, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-300"
                                >
                                  {citation}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-900/50 border border-purple-500/20 rounded-2xl p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                  <div ref={messagesEndRef} />
                </div>
              )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-6 pt-4 border-t border-purple-500/20 bg-gradient-to-t from-slate-950/50 to-transparent">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  mode === 'focused' && !documentContext
                    ? 'Select a document first...'
                    : 'Ask a question...'
                }
                disabled={isLoading || (mode === 'focused' && !documentContext)}
                className="flex-1 bg-slate-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-500/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || (mode === 'focused' && !documentContext)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
