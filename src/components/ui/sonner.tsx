import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "rgba(255, 255, 255, 0.08)",
          "--normal-text": "#ffffff",
          "--normal-border": "rgba(255, 255, 255, 0.15)",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "#ffffff",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
