import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles, Image as ImageIcon, Video as VideoIcon, Layers, Camera } from "lucide-react";
import "../styles/gallery.css";
import PageBackButton from "../components/PageBackButton";

const galleryImageModules = import.meta.glob(
  "../assets/gallery/*.{png,jpg,jpeg,webp,avif,gif,mp4,webm,mov}",
  { eager: true, import: "default" }
);

const videoExtensions = /\.(mp4|webm|mov)$/i;

const normalizeMedia = (imageModules) =>
  Object.entries(imageModules)
    .map(([path, src]) => {
      const fileName = String(path).split("/").pop() || "gallery-image";
      const label = fileName
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return {
        src,
        alt: label,
        key: fileName,
        type: videoExtensions.test(fileName) ? "video" : "image",
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

const allGalleryMedia = normalizeMedia(galleryImageModules);

const officeMedia = allGalleryMedia.filter((image) =>
  /office/i.test(image.key),
);
const campaignMedia = allGalleryMedia.filter(
  (image) => !/office/i.test(image.key),
);
const recentMedia = [...allGalleryMedia].reverse();

const mediaLabel = (items) => {
  const photoCount = items.filter((item) => item.type === "image").length;
  const videoCount = items.filter((item) => item.type === "video").length;
  return `${photoCount} Photos${videoCount > 0 ? `, ${videoCount} Videos` : ""}`;
};

const categoryCards = [
  {
    key: "office",
    title: "Office Culture",
    description: "Inside our workplace, team collaboration, and daily energy.",
    preview: officeMedia[0] || null,
    count: mediaLabel(officeMedia),
    icon: Camera,
  },
  {
    key: "campaign",
    title: "Hiring Campaigns",
    description: "Job drives, campus outreach, and recruitment events.",
    preview: campaignMedia[0] || null,
    count: mediaLabel(campaignMedia),
    icon: Sparkles,
  },
  {
    key: "recent",
    title: "Latest Highlights",
    description: "Fresh photos and videos captured from our newest milestones.",
    preview: recentMedia[0] || null,
    count: mediaLabel(recentMedia),
    icon: Layers,
  },
];

export default function Gallery({ setCurrentPage }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const activeImages = useMemo(() => {
    if (activeCategory === "office") return officeMedia;
    if (activeCategory === "campaign") return campaignMedia;
    if (activeCategory === "recent") return recentMedia;
    return [];
  }, [activeCategory]);

  const activeCategoryTitle =
    activeCategory === "office"
      ? "Office Culture"
      : activeCategory === "campaign"
      ? "Hiring Campaigns"
      : activeCategory === "recent"
      ? "Latest Highlights"
      : "";

  return (
    <main className="gallery-page ui-page">
      <div className="gallery-ambient gallery-ambient-one" aria-hidden="true" />
      <div className="gallery-ambient gallery-ambient-two" aria-hidden="true" />

      <section className="gallery-hero ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>
        <div className="gallery-badge-pill">
          <Camera size={14} />
          <span>HireNext Media Gallery</span>
        </div>
        <h1>Moments From Our Hiring Journey</h1>
        <p>Explore our company culture, recruitment drives, and workplace milestones.</p>
      </section>

      <section className="gallery-grid-wrap ui-shell">
        {!activeCategory ? (
          <div className="gallery-category-grid">
            {categoryCards.map((category, index) => {
              const CategoryIcon = category.icon;
              return (
                <button
                  type="button"
                  className="gallery-category-card glass-card"
                  key={category.key}
                  style={{ "--gallery-delay": `${Math.min(index * 120, 400)}ms` }}
                  onClick={() => setActiveCategory(category.key)}
                >
                  <div className="gallery-category-preview">
                    {category.preview?.type === "video" ? (
                      <video src={category.preview.src} aria-label={category.title} muted playsInline />
                    ) : category.preview ? (
                      <img src={category.preview.src} alt={category.title} />
                    ) : null}
                    <div className="category-icon-badge">
                      <CategoryIcon size={18} />
                    </div>
                  </div>
                  <div className="gallery-category-content">
                    <h2>{category.title}</h2>
                    <p>{category.description}</p>
                    <span className="category-count-badge">{category.count}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="gallery-active-panel">
            <div className="gallery-active-header">
              <h2>{activeCategoryTitle}</h2>
              <button type="button" className="btn-secondary gallery-back-btn" onClick={() => setActiveCategory(null)}>
                <ArrowLeft size={16} />
                <span>Back to Categories</span>
              </button>
            </div>
            {activeImages.length === 0 ? (
              <p className="gallery-empty">No media files found in this category.</p>
            ) : (
              <div className="gallery-grid">
                {activeImages.map((image, index) => (
                  <article
                    className="gallery-card glass-card"
                    key={image.key}
                    style={{ "--gallery-delay": `${Math.min(index * 70, 700)}ms` }}
                  >
                    {image.type === "video" ? (
                      <div className="media-wrapper">
                        <video src={image.src} controls preload="metadata" playsInline />
                        <span className="media-type-badge"><VideoIcon size={14} /></span>
                      </div>
                    ) : (
                      <div className="media-wrapper">
                        <img src={image.src} alt={image.alt} loading="lazy" />
                        <span className="media-type-badge"><ImageIcon size={14} /></span>
                      </div>
                    )}
                    <div className="gallery-card-overlay">{image.alt}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

