require("dotenv").config();

async function main() {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  const auth = Buffer.from(
    `${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `https://api.cloudinary.com/v2/asset_management/${CLOUDINARY_CLOUD_NAME}/collections`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Không lấy được Collections:", result);
    return;
  }

  console.log(
    JSON.stringify(
      result.data?.map((collection) => ({
        id: collection.id,
        name: collection.name,
        type: collection.type,
      })) ?? result,
      null,
      2
    )
  );
}

main().catch(console.error);