export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No se ha enviado ninguna imagen",
    });
  }

  return res.status(201).json({
    message: "Imagen subida correctamente",
    image: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
};

export const downloadImage = (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({
      message: "No se ha especificado ninguna imagen",
    });
  }

  res.download(`uploads/${filename}`, (error) => {
    if (error) {
      return res.status(404).json({
        message: "Imagen no encontrada",
      });
    }
  });
};

export const deleteImage = (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({
      message: "No se ha especificado ninguna imagen",
    });
  }

  // La eliminación real la implementaremos junto con el sistema de almacenamiento.

  return res.status(200).json({
    message: "Imagen eliminada correctamente",
    filename,
  });
};