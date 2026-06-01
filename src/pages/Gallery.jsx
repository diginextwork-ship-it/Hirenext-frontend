import { useMemo, useState } from "react";
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

const mediaLabel = (items) =>
  `${items.filter((item) => item.type === "image").length} photos${
    items.some((item) => item.type === "video") ? `, ${items.filter((item) => item.type === "video").length} videos` : ""
  }`;

const categoryCards = [
  {
    key: "office",
    title: "Office",
    description: "Inside our workplace, team culture, and daily operations.",
    preview: officeMedia[0] || null,
    count: mediaLabel(officeMedia),
  },
  {
    key: "campaign",
    title: "Campaign",
    description: "Hiring drives, outreach campaigns, and event highlights.",
    preview: campaignMedia[0] || null,
    count: mediaLabel(campaignMedia),
  },
  {
    key: "recent",
    title: "Recently Added",
    description: "Fresh photos and videos from the latest team moments.",
    preview: recentMedia[0] || null,
    count: mediaLabel(recentMedia),
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
      ? "Office"
      : activeCategory === "campaign"
      ? "Campaign"
      : activeCategory === "recent"
      ? "Recently Added"
      : "";

  return (
    <main className="gallery-page ui-page">
      <div className="gallery-ambient gallery-ambient-one" aria-hidden="true" />
      <div className="gallery-ambient gallery-ambient-two" aria-hidden="true" />

      <section className="gallery-hero ui-shell">
        <div className="ui-page-back">
          <PageBackButton setCurrentPage={setCurrentPage} />
        </div>
        <p className="gallery-badge">HireNext Gallery</p>
        <h1>Moments From Our Hiring Journey</h1>
        <p>A quick look at our team culture, events, and hiring milestones.</p>
      </section>

      <section className="gallery-grid-wrap ui-shell">
        {!activeCategory ? (
          <div className="gallery-category-grid">
            {categoryCards.map((category, index) => (
              <button
                type="button"
                className="gallery-category-card"
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
                </div>
                <div className="gallery-category-content">
                  <h2>{category.title}</h2>
                  <p>{category.description}</p>
                  <span>{category.count}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="gallery-active-panel">
            <div className="gallery-active-header">
              <h2>{activeCategoryTitle} Photos</h2>
              <button type="button" className="gallery-back-btn" onClick={() => setActiveCategory(null)}>
                Back to categories
              </button>
            </div>
            {activeImages.length === 0 ? (
              <p className="gallery-empty">No images found in this category.</p>
            ) : (
              <div className="gallery-grid">
                {activeImages.map((image, index) => (
                  <article
                    className="gallery-card"
                    key={image.key}
                    style={{ "--gallery-delay": `${Math.min(index * 70, 700)}ms` }}
                  >
                    {image.type === "video" ? (
                      <video src={image.src} controls preload="metadata" playsInline />
                    ) : (
                      <img src={image.src} alt={image.alt} loading="lazy" />
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
