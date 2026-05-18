import path from "path";
import uploadHelper from "../../utils/uploadHelper.js";
import TestModel from "../models/testModel.js";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const savedPaths = await uploadHelper.uploadDocuments("resume/test", [req.file]);

    res.json({
      success: true,
      message: "Resume uploaded",
      files: savedPaths,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadRequirements = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const savedPaths = await uploadHelper.uploadDocuments("requirements", req.files);

    res.json({
      success: true,
      message: "Requirements uploaded",
      files: savedPaths,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const optimizeSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const uploadedPath = req.file.path;

    const optimizedPath = await uploadHelper.optimizeImage(uploadedPath,{outputDir:"test/react-js"});

    res.json({
      success: true,
      message: "Single image optimized",
      file: optimizedPath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const updateSingleImage = async (req, res) => {
  try {
    const { oldFile } = req.body; // send from client: old file path stored in DB

    const newUploadedPath = req.file?.path || null;

    const updatedFile = await uploadHelper.mergeUploadedFiles({
      oldValue: oldFile,
      newUploaded: newUploadedPath,
      outputDir: "test/react-js",
    });

    res.json({
      success: true,
      message: "Single image updated",
      file: updatedFile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const optimizeMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    const uploadedPaths = req.files.map(f => f.path);

    const optimizedPaths = await uploadHelper.optimizeImage(uploadedPaths,{outputDir:"projects"});

    res.json({
      success: true,
      message: "Multiple images optimized",
      files: optimizedPaths,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const updateMultipleImages = async (req, res) => {
  try {
    const { oldFiles, filesToReplace } = req.body;

    // oldFiles: array of existing file paths from DB
    // filesToReplace: array of old file paths that user wants to replace

    const oldFilesArray = oldFiles ? JSON.parse(oldFiles) : [];
    const filesToReplaceArray = filesToReplace ? JSON.parse(filesToReplace) : [];

    const newUploadedPaths = req.files?.map(f => f.path) || [];

    const updatedFiles = await uploadHelper.mergeUploadedFiles({
      oldValue: oldFilesArray,
      newUploaded: newUploadedPaths,
      filesToReplace: filesToReplaceArray,
      outputDir: "projects",
    });

    res.json({
      success: true,
      message: "Multiple images updated",
      files: updatedFiles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteFile = async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ success: false, message: "filePath is required" });
    }

    await uploadHelper.deleteFile(filePath);

    res.json({
      success: true,
      message: "File deleted",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const createProject = async (req, res) => {

    try {
    const { name } = req.body;

    const filePaths = uploadHelper.extractFilePaths(req.files);

    const optimizedBanner = filePaths.banner_image
      ? await uploadHelper.optimizeImage(filePaths.banner_image, { outputDir: 'test-projects' })
      : null;

    const optimizedImages = filePaths.images
      ? await uploadHelper.optimizeImage(filePaths.images, { outputDir: 'test-projects' })
      : [];

    const project = await TestModel.create({
      name,
      banner: optimizedBanner,
      images: optimizedImages,
    });

    res.status(201).json({
      success: true,
      message: 'Test Project created',
      data: project,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }

};



export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await TestModel.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // 📥 extract uploaded files (if any)
    const filePaths = uploadHelper.extractFilePaths(req.files);

    // 📝 parse body params for files to replace (only for multi fields)
    const bannerToReplace = req.body.bannerToReplace || null;
    const imagesToReplace = req.body.imagesToReplace ? JSON.parse(req.body.imagesToReplace) : [];

    // 🖼️ update banner
    project.banner = await uploadHelper.mergeUploadedFiles({
      oldValue: project.banner,
      newUploaded: filePaths.banner_image,
      filesToReplace: bannerToReplace,
      outputDir: "test-projects"
    });

    // 🖼️ update gallery images
    project.images = await uploadHelper.mergeUploadedFiles({
      oldValue: project.images,
      newUploaded: filePaths.images,
      filesToReplace: imagesToReplace,
      outputDir: "test-projects"
    });

    // 📝 update other fields
    project.name = req.body.name || project.title;

    await project.save();

    res.json({ success: true, message: "Project updated", data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
