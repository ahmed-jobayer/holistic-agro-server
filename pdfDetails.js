const mongoose = require("mongoose");

const pdfDetailsSchema = new mongoose.Schema(
  {
    pdf: String,
    name: String,
    email: String,
    phone: String,
  },
  { collection: "pdfDetails" }
);

mongoose.model("pdfDetails", pdfDetailsSchema);
