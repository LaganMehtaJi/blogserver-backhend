import Product  from "../models/Product.models.js";
import cloudinary from "../utils/cloudinary.js";


// =======================================
// ➕ Add Product
// =======================================
export const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      brand,
      sku,
      price,
      discountPrice,
      stock,
      specifications,
      tags,
      isFeatured,
    } = req.body;

    // Basic validation
    if (!name || !description || !category || !price || !sku) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    // Check duplicate SKU
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    // Images already uploaded to Cloudinary via multer-storage-cloudinary
    const images = req.files.map((file) => ({
      id: file.filename || "",
      url: file.path || "",
      alt: name,
    }));

    const newProduct = new Product({
      name,
      description,
      category,
      brand,
      sku,
      price,
      discountPrice,
      stock,
      specifications: specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : {},
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      isFeatured,
      images,
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product added successfully ✅",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// =======================================
// 📂 Get All Products
// =======================================
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// =======================================
// 🔍 Get Product By ID
// =======================================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// =======================================
// ✏️ Update Product
// =======================================
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let updatedImages;

    // If new images uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary safely
      if (product.images && product.images.length > 0) {
        for (let img of product.images) {
          if (img.id) {
            try {
              await cloudinary.uploader.destroy(img.id);
            } catch (delErr) {
              console.warn("Could not delete product image from Cloudinary:", delErr.message);
            }
          }
        }
      }

      updatedImages = req.files.map((file) => ({
        id: file.filename || "",
        url: file.path || "",
        alt: req.body.name || product.name,
      }));
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        ...req.body,
        specifications: req.body.specifications
          ? (typeof req.body.specifications === 'string' ? JSON.parse(req.body.specifications) : req.body.specifications)
          : undefined,
        tags: req.body.tags ? (typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags) : undefined,
        ...(updatedImages && { images: updatedImages }),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Product updated successfully ✅",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// =======================================
// ❌ Delete Product
// =======================================
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete images from Cloudinary safely
    if (product.images && product.images.length > 0) {
      for (let img of product.images) {
        if (img.id) {
          try {
            await cloudinary.uploader.destroy(img.id);
          } catch (delErr) {
            console.warn("Could not delete product image from Cloudinary:", delErr.message);
          }
        }
      }
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: "Product deleted successfully ✅" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
