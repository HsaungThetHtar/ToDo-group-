import React, { useState, useEffect } from "react";

const API_URL = "http://localhost:5001/api";

function EditProfile({ username, onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fullName, setFullName] = useState("");
  const [currentImage, setCurrentImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load current profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profile/${username}`);
      const data = await response.json();
      console.log(data);
      setFullName(data.full_name || "");
      setCurrentImage(data.profile_image);
      setLoading(false);
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile");
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSave = async () => {
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    const formData = new FormData();
    formData.append("full_name", fullName);

    if (file) {
      formData.append("profile_image", file);
    }

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to update profile");
        return;
      }

      // Update current image if a new one was uploaded
      if (data.profile_image) {
        setCurrentImage(data.profile_image);
      }
      setFile(null);
      setPreview(null);

      alert("✅ Profile updated successfully!");
      onBack();
    } catch (err) {
      console.error(err);
      setError("Server error. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={onBack}
      className="p-2 hover:bg-gray-100 rounded-full transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    </button>
    <h2 className="text-xl font-bold">Edit Profile</h2>
  </div>

      <p className="mb-4 text-gray-600">
        Username: <span className="font-medium">{username}</span>
      </p>

      {/* Show current profile picture */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Current Profile Picture</label>
        {currentImage ? (
          <img
            src={currentImage.startsWith('http') ? currentImage : `http://localhost:5001${currentImage}`}
            alt="Current profile"
            className="w-32 h-32 rounded-full object-cover mb-2"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-2">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>

      {/* Full name input */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Full Name</label>
        <input
          type="text"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* Upload new picture */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Change Profile Picture</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full"
        />
      </div>

      {/* Preview new image */}
      {preview && (
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">New Picture Preview</label>
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 rounded-full object-cover"
          />
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditProfile;