import { Component, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// Model output is untrusted. Start from the library's safe schema, then tighten:
// no embedded media / styles / form controls, and no class attributes except the
// language hint on code blocks.
const schema = {
   ...defaultSchema,
   tagNames: (defaultSchema.tagNames ?? []).filter(
      (tag) => !["img", "iframe", "video", "audio", "style", "input", "svg", "picture", "source"].includes(tag)
   ),
   attributes: {
      ...defaultSchema.attributes,
      "*": (defaultSchema.attributes?.["*"] ?? []).filter((attr) => attr !== "className" && attr !== "class"),
      code: ["className"],
      a: ["href", "title"],
   },
   protocols: {
      ...defaultSchema.protocols,
      href: ["http", "https", "mailto"],
   },
};

const components: Components = {
   a(props) {
      const { node, ...rest } = props;
      void node;
      return <a {...rest} target="_blank" rel="noreferrer nofollow" className="text-brand underline underline-offset-2" />;
   },
   p: (props) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
   ul: (props) => <ul className="my-2 list-disc pl-5 space-y-1" {...props} />,
   ol: (props) => <ol className="my-2 list-decimal pl-5 space-y-1" {...props} />,
   li: (props) => <li className="leading-relaxed" {...props} />,
   h1: (props) => <h1 className="mt-4 mb-2 text-xl font-bold text-ink first:mt-0" {...props} />,
   h2: (props) => <h2 className="mt-4 mb-2 text-lg font-bold text-ink first:mt-0" {...props} />,
   h3: (props) => <h3 className="mt-3 mb-1 text-base font-bold text-ink first:mt-0" {...props} />,
   strong: (props) => <strong className="font-bold text-ink" {...props} />,
   blockquote: (props) => (
      <blockquote className="my-2 border-l-2 border-border-hiyori pl-3 text-ink-muted" {...props} />
   ),
   code(props) {
      const { node, className, children, ...rest } = props;
      void node;
      const inline = !className;
      return inline ? (
         <code className="rounded bg-page px-1.5 py-0.5 text-[0.9em] font-mono" {...rest}>
            {children}
         </code>
      ) : (
         <code className={`${className ?? ""} font-mono text-sm`} {...rest}>
            {children}
         </code>
      );
   },
   pre: (props) => (
      <pre className="my-2 overflow-x-auto rounded-xl border border-border-hiyori bg-page p-3" {...props} />
   ),
   table: (props) => (
      <div className="my-2 overflow-x-auto">
         <table className="w-full border-collapse text-sm" {...props} />
      </div>
   ),
   th: (props) => <th className="border border-border-hiyori px-2 py-1 text-left font-bold" {...props} />,
   td: (props) => <td className="border border-border-hiyori px-2 py-1" {...props} />,
};

class MarkdownBoundary extends Component<{ raw: string; children: ReactNode }, { failed: boolean }> {
   state = { failed: false };

   static getDerivedStateFromError() {
      return { failed: true };
   }

   componentDidUpdate(prev: { raw: string }) {
      // A half-written fence mid-stream can throw; recover once more text arrives.
      if (this.state.failed && prev.raw !== this.props.raw) this.setState({ failed: false });
   }

   render() {
      if (this.state.failed) {
         return <p className="whitespace-pre-wrap leading-relaxed">{this.props.raw}</p>;
      }
      return this.props.children;
   }
}

export function Markdown({ content }: { content: string }) {
   return (
      <MarkdownBoundary raw={content}>
         <div className="text-ink text-[0.95rem]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]} components={components}>
               {content}
            </ReactMarkdown>
         </div>
      </MarkdownBoundary>
   );
}
