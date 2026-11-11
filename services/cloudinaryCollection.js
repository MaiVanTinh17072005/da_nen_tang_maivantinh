
async function addImageToCollection(assetId) {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_COLLECTION_ID,
  } = process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET ||
    !CLOUDINARY_COLLECTION_ID
  ) {
    throw new Error(
      "Thiếu cấu hình Cloudinary Collection"
    );
  }

  if (!assetId) {
    throw new Error("Thiếu asset_id của ảnh");
  }

  const credentials = Buffer.from(
    `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`
  ).toString("base64");

  const url =
    `https://api.cloudinary.com/v2/asset_management/` +
    `${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}` +
    `/collections/` +
    `${encodeURIComponent(CLOUDINARY_COLLECTION_ID)}` +
    `/assets`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([assetId]),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `HTTP ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

module.exports = {
  addImageToCollection,
};
