const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

app.use("/files", express.static("files"));

// middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    // origin: "https://holistic-agro-by-jobayer.surge.sh",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// token verification

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No Token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (error, decoded) => {
    if (error) {
      return res.send({ message: "Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

// verify admin
const verifyAdmin = async (req, res, next) => {
  const phone = req.decoded.phone;
  const user = await userCollection.findOne({ phone: phone });
  if (user?.role !== "admin") {
    return res
      .status(403)
      .send({ message: "You are not authorized to perform this action" });
  }
  next();
};

// mongodb
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ugffr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ugffr.mongodb.net/HolisticAgro?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => console.log("Mongoose connected to MongoDB"))
  .catch((err) => console.error("Mongoose connection error:", err));

const userCollection = client.db("HolisticAgro").collection("users");
const productCollection = client.db("HolisticAgro").collection("products");
const orderCollection = client.db("HolisticAgro").collection("orders");
const categoryCollection = client.db("HolisticAgro").collection("categories");
const couponCollection = client.db("HolisticAgro").collection("coupons");
const employeCollection = client.db("HolisticAgro").collection("employees");
const jobCollection = client.db("HolisticAgro").collection("jobs");
const banner = client.db("HolisticAgro").collection("banner");
const problemAndSolutionCollection = client.db("HolisticAgro").collection("problemAndSolution");

const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database Connected");

    // get nanner

    app.get("/banner", async (req, res) => {
      try {
        const result = await banner.find().toArray(); // Convert cursor to array
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching banner:", error.message);
        res.status(500).send({ error: "Failed to fetch banner" });
      }
    });

    // post user

    app.post("/user", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ phone: user.phone });

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get single user by phone

    app.get("/user/:phone", async (req, res) => {
      const phone = req.params.phone;
      const query = { phone: phone };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // add product
    app.post("/add-product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // update a product by id

    app.patch(
      "/update-product/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedProduct = req.body;

        const query = { _id: new ObjectId(String(id)) };
        const updatedDoc = { $set: updatedProduct };

        const result = await productCollection.updateOne(query, updatedDoc);
        res.send(result);
      }
    );

    // get all product
    app.get("/products", async (req, res) => {
      try {
        const result = await productCollection.find().toArray(); // Convert cursor to array
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching products:", error.message);
        res.status(500).send({ error: "Failed to fetch products" });
      }
    });
    //  Text Search API (Case-Insensitive)
    app.get("/search-products", async (req, res) => {
      try {
        const { title } = req.query;
        if (!title) {
          return res.status(400).json({ message: "Title query is required" });
        }

        const query = { title: { $regex: title, $options: "i" } };

        // Fetch matching products
        const result = await productCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error searching products:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // get product by id

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: new ObjectId(String(id)) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // api to fetch products by matching IDs
    app.post("/products-by-ids", async (req, res) => {
      try {
        const { ids } = req.body; // Expect an array of product IDs in the request body
        if (!ids || !Array.isArray(ids)) {
          return res
            .status(400)
            .send({ error: "Invalid 'ids' provided. It must be an array." });
        }

        // convert string ids to objectid instances for mongodb query
        const objectIds = ids.map((id) => new ObjectId(String(id)));
        // Query the database to find matching products
        const products = await productCollection
          .find({ _id: { $in: objectIds } })
          .toArray();

        res.status(200).send(products); // Send the products back as a response
      } catch (error) {
        console.error("Error fetching products by IDs:", error.message);
        res.status(500).send({ error: "Failed to fetch products by IDs" });
      }
    });

    // delete product with id
    app.delete("/delete-product/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const result = await productCollection.deleteOne({
        _id: new ObjectId(String(id)),
      });
      // console.log(result);
      res.send(result);
    });

    // add categories
    app.post("/add-category", verifyJWT, verifyAdmin, async (req, res) => {
      const category = req.body;
      console.log(category);
      const result = await categoryCollection.insertOne(category);
      console.log(result);
      res.send(result);
    });

    // get all categorie
    app.get("/categories", async (req, res) => {
      try {
        const result = await categoryCollection.find().toArray(); // Convert cursor to array
        // console.log(result)
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching categories:", error.message);
        res.status(500).send({ error: "Failed to fetch categories" });
      }
    });

    // delete category with id
    app.delete(
      "/delete-category/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        // console.log(id);
        const result = await categoryCollection.deleteOne({
          _id: new ObjectId(String(id)),
        });
        // console.log(result);
        res.send(result);
      }
    );

    // get products by categories

    app.get("/products/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    // patch cart in the user
    app.patch("/add-to-cart", verifyJWT, async (req, res) => {
      const cartProduct = req.body;
      const userPhone = req.decoded.phone;

      try {
        const query = { phone: userPhone };
        const updatedDoc = {
          $addToSet: { cart: cartProduct },
        };

        const result = await userCollection.updateOne(query, updatedDoc);
        // console.log(result, cartProduct, userPhone);
        if (result.matchedCount > 0 && result.modifiedCount === 0) {
          res.send({
            message: "Product is already in the cart",
            result,
          });
        } else if (result.modifiedCount > 0) {
          res.send({
            message: "Product added to the cart successfully",
            result,
          });
        } else {
          // User not found
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).send({ error: "Failed to add product to cart" });
      }
    });

    // app.delete("/remove-from-cart", verifyJWT, async (req, res) => {
    //   const title = req.query.title; // The title of the item to be removed
    //   const userPhone = req.decoded.phone; // Get the user's phone number from the JWT

    //   try {
    //     // Find the user by phone and update the cart
    //     const query = { phone: userPhone };
    //     const update = { $pull: { cart: { title } } };

    //     const result = await userCollection.updateOne(query, update);
    //     console.log(title, userPhone, result);
    //     if (result.modifiedCount > 0) {
    //       res.status(200).send({
    //         message: "Item removed from the cart successfully",
    //         result,
    //       });
    //     } else {
    //       res.status(404).send({
    //         message: "Item not found in the cart or user not found",
    //       });
    //     }
    //   } catch (error) {
    //     console.error("Error removing item from cart:", error.message);
    //     res.status(500).send({
    //       error: "Failed to remove item from cart",
    //     });
    //   }
    // });

    // Update quantity in the cart
    // app.patch("/update-cart-quantity", verifyJWT, async (req, res) => {
    //   const { title, quantityChange } = req.body; // `quantityChange` is +1 or -1
    //   const userPhone = req.decoded.phone;

    //   try {
    //     const query = { phone: userPhone, "cart.title": title };
    //     const update = { $inc: { "cart.$.quantity": quantityChange } };

    //     const result = await userCollection.updateOne(query, update);

    //     if (result.modifiedCount > 0) {
    //       res
    //         .status(200)
    //         .send({ message: "Quantity updated successfully", result });
    //     } else {
    //       res
    //         .status(404)
    //         .send({ message: "Item not found in the cart or user not found" });
    //     }
    //   } catch (error) {
    //     console.error("Error updating quantity:", error.message);
    //     res.status(500).send({ error: "Failed to update quantity" });
    //   }
    // });

    // add orders
    app.post("/add-order", verifyJWT, async (req, res) => {
      const orderProduct = req.body;
      const userLoginNumber = req.decoded.phone;
      const orderData = { userLoginNumber, ...orderProduct };
      // console.log(orderData);
      try {
        const result = await orderCollection.insertOne(orderData);
        // console.log(result);
        // clear user cart
        if (result.insertedId) {
          const query = { phone: userLoginNumber };
          const update = { $set: { cart: [] } };
          const clearCartResult = await userCollection.updateOne(query, update);
          // check if cart was cleared
          if (clearCartResult.modifiedCount > 0) {
            return res.send({
              message: "Order added successfully and cart cleared",
              result,
            });
          }
          return res.send({
            message: "Order added successfully but cart not cleared",
            result,
          });
        }
        res.status(500).send({ error: "Failed to add order" });
      } catch (error) {
        console.log("Error adding order and clearing cart:", error.message);
        res.status(500).send({ error: "Failed to add order and clear cart" });
      }
    });
    // get orders

    app.get("/orders", verifyJWT, async (req, res) => {
      const userLoginNumber = req.decoded.phone;
      const user = await userCollection.findOne({ phone: userLoginNumber });
      let query = {};
      if (user?.role !== "admin") {
        query = { userLoginNumber: userLoginNumber };
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    // update order status
    app.patch(
      "/update-order-status/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedStatus = req.body.status;

        const query = { _id: new ObjectId(String(id)) };
        const update = { $set: { status: updatedStatus } };

        const result = await orderCollection.updateOne(query, update);
        res.send(result);
      }
    );

    // get all coupons
    app.get("/coupons", verifyJWT, async (req, res) => {
      try {
        const result = await couponCollection.find().toArray(); // Convert cursor to array
        // console.log(result)
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching coupons:", error.message);
        res.status(500).send({ error: "Failed to fetch coupons" });
      }
    });

    // add coupons
    app.post("/add-coupon", verifyJWT, verifyAdmin, async (req, res) => {
      const coupon = req.body;
      console.log(coupon);
      const result = await couponCollection.insertOne(coupon);
      console.log(result);
      res.send(result);
    });

    // delete coupons with id
    app.delete(
      "/delete-coupon/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const result = await couponCollection.deleteOne({
          _id: new ObjectId(String(id)),
        });
        // console.log(result);
        res.send(result);
      }
    );

    // get all employees
    app.get("/employees", async (req, res) => {
      try {
        const result = await employeCollection.find().toArray(); // Convert cursor to array
        // console.log(result)
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching employees:", error.message);
        res.status(500).send({ error: "Failed to fetch employees" });
      }
    });

    // add employees
    app.post("/add-employee", verifyJWT, verifyAdmin, async (req, res) => {
      const employe = req.body;
      // console.log(employe);
      const result = await employeCollection.insertOne(employe);
      // console.log(result);
      res.send(result);
    });

    // delete employees with id
    app.delete(
      "/delete-employee/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const result = await employeCollection.deleteOne({
          _id: new ObjectId(String(id)),
        });
        // console.log(result);
        res.send(result);
      }
    );

    // get all jobs
    app.get("/jobs", async (req, res) => {
      try {
        const result = await jobCollection.find().toArray(); // Convert cursor to array
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching jobs:", error.message);
        res.status(500).send({ error: "Failed to fetch jobs" });
      }
    });

    // add job
    app.post("/add-job", verifyJWT, verifyAdmin, async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // delete job with id
    app.delete("/delete-job/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await jobCollection.deleteOne({
        _id: new ObjectId(String(id)),
      });
      res.send(result);
    });

    // get all problem and solution post
    app.get("/problem-and-solution-posts", async (req, res) => {
      try {
        const result = await problemAndSolutionCollection.find().toArray(); // Convert cursor to array
        res.send(result); // Send the array as the response
      } catch (error) {
        console.error("Error fetching jobs:", error.message);
        res.status(500).send({ error: "Failed to fetch jobs" });
      }
    });

    // add post
    app.post(
      "/add-problem-and-solution-post",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const job = req.body;
        const result = await problemAndSolutionCollection.insertOne(job);
        res.send(result);
      }
    );

    // delete post with id
    app.delete(
      "/delete-problem-and-solution-post/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await problemAndSolutionCollection.deleteOne({
          _id: new ObjectId(String(id)),
        });
        res.send(result);
      }
    );

    // get posts by id
    app.get("/post-by-id/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(String(id)) };
      const result = await problemAndSolutionCollection.findOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();
// api

// multer----------------------------

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});
require("./pdfDetails");
const pdfSchema = mongoose.model("pdfDetails");
const upload = multer({ storage: storage });

app.post("/upload-files", upload.single("file"), async (req, res) => {
  // console.log(req.file);
  const name = req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const fileName = req.file.filename;
  try {
    await pdfSchema.create({ name: name, email: email, phone: phone, pdf: fileName });
    res.send({ status: "ok" });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/get-files", async (req, res) => {
  try {
    pdfSchema.find({}).then((data) => {
      res.send({ status: "ok", data: data });
    });
  } catch (error) {}
});

// delete file with id
app.delete("/delete-file/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the document first to get the filename
    const document = await pdfSchema.findById(id);
    if (!document) {
      return res.status(404).send({ message: "Document not found" });
    }

    // Delete from database
    await pdfSchema.findByIdAndDelete(id);

    // Delete the physical file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'files', document.pdf);
    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        return res.status(500).send({ message: "Error deleting file" });
      }
      res.send({ message: "Document deleted successfully" });
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).send({ message: "Server error" });
  }
});

// server running status------------

app.get("/", (req, res) => {
  res.send("server is running");
});

app.post("/authentication", async (req, res) => {
  const userNumber = req.body;
  const token = jwt.sign(userNumber, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  res.send(token);
});

app.listen(port, () => {
  console.log(`server is running on port, ${port}`);
});
