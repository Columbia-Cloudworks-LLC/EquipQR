interface ScreenshotBlockProps {
  imageUrl: string;
  imageAlt: string;
  title: string;
  description: string;
}

export const ScreenshotBlock = ({ imageUrl, imageAlt, title, description }: ScreenshotBlockProps) => {
  return (
    <div className="bg-muted/50 rounded-xl p-8 border border-border">
      <div className="rounded-lg overflow-hidden mb-4 border border-border">
        <img src={imageUrl} alt={imageAlt} className="w-full h-auto" loading="lazy" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};
