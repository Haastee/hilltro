import { useRef, useState, type DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { managedProperties } from "../../data/landlordProperties";
import { assetUrl } from "../../utils/asset";

export function PropertyGalleryPage() {
  const { propertyId } = useParams();
  const property = managedProperties.find((item) => item.id === propertyId) || managedProperties[0];
  const [images, setImages] = useState(property.gallery);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  function reorder(index: number, direction: -1 | 1) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    setSelected(target);
  }

  function addFiles(files: FileList | File[]) {
    const next = [...files].filter((file) => file.type.startsWith("image/")).map((file) => URL.createObjectURL(file));
    setImages([...images, ...next]);
    next.forEach((url) => {
      setProgress((current) => ({ ...current, [url]: 18 }));
      window.setTimeout(() => setProgress((current) => ({ ...current, [url]: 68 })), 250);
      window.setTimeout(() => setProgress((current) => ({ ...current, [url]: 100 })), 650);
    });
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <main className="page">
      <section className="gallery-header">
        <div><p className="badge orange">Property gallery</p><h1>{property.address}</h1><p className="muted">Control image ordering exactly as applicants see it.</p></div>
        <div className="hero-actions"><button className="btn primary" onClick={() => setEditing(!editing)}>{editing ? "Done Editing" : "Edit Photos"}</button><Link className="btn" to="/landlord/properties">Back</Link></div>
      </section>
      <section className="gallery-layout">
        <article className="card gallery-viewer">
          <img src={images[selected]} alt="" />
          <div className="hero-actions"><button className="btn" onClick={() => setSelected(Math.max(0, selected - 1))}>Previous</button><button className="btn" onClick={() => setSelected(Math.min(images.length - 1, selected + 1))}>Next</button></div>
        </article>
        <aside className="card gallery-strip">
          {editing && <div className={`dropzone photo-drop ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => inputRef.current?.click()}><div><b>Drag photos here or click to upload</b><p className="muted">Multiple upload is supported.</p></div><input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} /></div>}
          {images.map((image, index) => (
            <div className={`gallery-thumb ${selected === index ? "active" : ""}`} key={`${image}-${index}`}>
              <button onClick={() => setSelected(index)}><img src={image} alt="" /><span>{index + 1}</span></button>
              {progress[image] !== undefined && <div className="upload-progress"><span style={{ width: `${progress[image]}%` }} /></div>}
              {editing && <div className="hero-actions"><button className="btn" onClick={() => reorder(index, -1)}>Up</button><button className="btn" onClick={() => reorder(index, 1)}>Down</button><button className="btn" onClick={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}>Delete</button><button className="btn" onClick={() => setImages(images.map((item, itemIndex) => itemIndex === index ? assetUrl("assets/london-apartment-photo.png") : item))}>Replace</button></div>}
            </div>
          ))}
          {editing && <button className="btn primary" onClick={() => inputRef.current?.click()}>Upload Photo</button>}
        </aside>
      </section>
    </main>
  );
}
