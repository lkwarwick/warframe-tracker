import { useUserStore } from "../persistence/userStore";
import { saveToGist } from "../persistence/gistSync";
import { useState } from "react";
import "./SaveButton.css";

export default function SaveButton() {
  const data = useUserStore((s) => s.data);
  const markClean = useUserStore((s) => s.markClean);
  const isDirty = useUserStore((s) => s.dirty);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!data || saving || !isDirty) return;
    setSaving(true);
    try {
      await saveToGist(data);
      markClean();
    } catch (err) {
      console.error("Could not save to Gist:", err);
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !isDirty || saving;

  // Determine the label dynamically
  let buttonText = "Save";
  if (saving) {
    buttonText = "Saving...";
  } else if (!isDirty) {
    buttonText = "Saved";
  }

  return (
    <button 
      className={`save-button ${saving ? "saving" : ""} ${!isDirty ? "clean" : ""}`} 
      onClick={handleSave} 
      disabled={isDisabled}
    >
      {buttonText}
    </button>
  );
}