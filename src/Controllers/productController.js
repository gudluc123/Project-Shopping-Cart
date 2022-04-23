const ProductModel = require("../Model/ProductModel");
const aws = require("aws-sdk");
const mongoose = require("mongoose");
const validator = require("../Validator/validation");

// ****************************************************************** AWS-S3 ****************************************************************** //

aws.config.update({
  accessKeyId: "AKIAY3L35MCRVFM24Q7U", // id
  secretAccessKey: "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", // secret password
  region: "ap-south-1",
});

// this function uploads file to AWS and gives back the url for the file
let uploadFile = async (file) => {
  return new Promise(function (resolve, reject) {
    let s3 = new aws.S3({ apiVersion: "2006-03-01" });
    var uploadParams = {
      ACL: "public-read",
      Bucket: "classroom-training-bucket", // HERE
      Key: "group37/profileImages/" + file.originalname, // HERE
      Body: file.buffer,
    };

    s3.upload(uploadParams, function (err, data) {
      if (err) {
        return reject({ error: err });
      }
      console.log(data);
      console.log("File uploaded successfully.");
      return resolve(data.Location); //HERE
    });
  });
};

// ************************************************************* POST /products ************************************************************ //

const createProduct = async function (req, res) {
  try {
    const body = req.body;
    // const body = req.body.data
    // const JSONbody = JSON.parse(body)

    // Validate body
    if (!validator.isValidBody(body)) {
      return res
        .status(400)
        .send({ status: false, msg: "Product details must be present" });
    }

    // Validate query (it must not be present)
    const query = req.query;
    if (validator.isValidBody(query)) {
      return res.status(400).send({ status: false, msg: "Invalid parameters" });
    }

    // Validate params (it must not be present)
    const params = req.params;
    if (validator.isValidBody(params)) {
      return res.status(400).send({ status: false, msg: "Invalid parameters" });
    }

    const {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      isFreeShipping,
      style,
      availableSizes,
      installments,
    } = body;

    // Validate title
    if (!validator.isValid(title)) {
      return res.status(400).send({ status: false, msg: "Title is required" });
    }

    // Validate description
    if (!validator.isValid(description)) {
      return res
        .status(400)
        .send({ status: false, msg: "Description is required" });
    }

    // Validate price
    if (!validator.isValid(price)) {
      // if(typeof price !== "number") {
      return res.status(400).send({ status: false, msg: "price must be present in body" });
    }

    // Validate price
    if (!validator.isValidPrice(price)) {
      // if(typeof price !== "number") {
      return res.status(400).send({ status: false, msg: "price must be in  number" });
    }

    // Validate currencyId
    if (!validator.isValid(currencyId)) {
      return res
        .status(400)
        .send({ status: false, msg: "currencyId is required" });
    }

    // Validate currencyFormat
    if (!validator.isValid(currencyFormat)) {
      return res
        .status(400)
        .send({ status: false, msg: "currencyFormat is required" });
    }

    // Validate availableSizes
    if (!validator.isValidSize(availableSizes)) {
      return res.status(400).send({ status: false, msg: "Invalid Size" });
    }

    // Checking duplicate entry of title
    let duplicateTitle = await ProductModel.find({ title: title });
    if (duplicateTitle.length != 0) {
      return res
        .status(400)
        .send({ status: false, msg: "Title already exist" });
    }

    let files = req.files;
    if (files && files.length > 0) {
      let uploadedFileURL = await uploadFile(files[0]);

      const product = {
        title,
        description,
        price,
        currencyId: "₹",
        currencyFormat: "INR",
        isFreeShipping,
        productImage: uploadedFileURL,
        style: style,
        availableSizes,
        installments,
      };
      let productData = await ProductModel.create(product);
      return res
        .status(201)
        .send({ status: true, msg: "Product created", data: productData });
    } else {
      return res
        .status(400)
        .send({ status: false, msg: "Product image is required" });
    }
  } catch (err) {
    console.log("This is the error :", err.message);
    res.status(500).send({ msg: "Error", error: err.message });
  }
};

// Get Specific Product

const getSelectedProduct = async function (req, res) {
  try {
    let data = { isDeleted: false };
    let productsize = req.query.size;

    if (productsize) {
      if (
        !validator.isValid(productsize) &&
        validator.isValidSize(productsize)
      ) {
        return res
          .status(400)
          .send({ status: false, msg: "please enter a valid product size" });
      }
      data["availableSizes"] = productsize;
    }

    let name = req.query.name;
    if (name) {
      if (!validator.isValid(name)) {
        return res
          .status(400)
          .send({ status: false, msg: "please enter a valid name" });
      }
      data["title"] = { $regex: name, $options: "i" };
    }

    let priceGreaterThan = req.query.priceGreaterThan;

    if (priceGreaterThan) {
      if (!validator.isValid(priceGreaterThan)) {
        return res
          .status(400)
          .send({ status: false, msg: "please enter a valid price" });
      }
      data["price"] = { $gt: priceGreaterThan };
    }

    let priceLessThan = req.query.priceLessThan;
    if (priceLessThan) {
      if (!validator.isValid(priceLessThan)) {
        return res
          .status(400)
          .send({ status: false, msg: "please enter a valid price" });
      }

      data["price"] = { $lt: priceLessThan };
    }

    if (priceLessThan && priceGreaterThan) {
      if (!validator.isValid(priceLessThan))
        return res
          .status(400)
          .send({ status: false, msg: "eneter valid price" });
      if (!validator.isValid(priceGreaterThan))
        return res
          .status(400)
          .send({ status: false, msg: "enter a valid price" });

      data["price"] = { $lt: priceLessThan, $lt: priceGreaterThan };
    }
    
  if (pricesort){
  
    if (!(validator.isValidpriceSort(pricesort))){
      return res.status(400).send({status:false, msg:"price must be ascending or desecending order"})
    }
    let finalProduct = await ProductModel.find(data).sort({
      price: req.query.pricesort,
    });
  }
    if (finalProduct.length == 0) {
      return res
        .status(404)
        .send({
          status: false,
          msg: "no any product exixt",
          
        });
    }
    return res
      .status(200)
      .send({ status: true, msg: "your specific product", data: finalProduct });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

const getProductById = async function (req, res) {
  try {
    const productId = req.params.productId;

    if (!validator.isValidobjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, msg: `this ${productId} is not valid` });
    }
    let findProductId = await ProductModel.findById({ _id: productId });

    if (!findProductId)
      return res
        .status(404)
        .send({
          status: false,
          msg: `this ${productId} is not exists in data base `,
        });

    return res.status(200).send({ status: false, data: findProductId });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

const updateProductById = async function (req, res) {
  try {

    const product = req.body;
    const productId = req.params.productId;

    if (!validator.isValid(productId) && validator.isValidobjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, msg: `this ${productId} is should be valid` });
    }
    const {title, description, price, isFreeShipping, style, availableSizes, installments} = product

    let productExists = await ProductModel.findById({ _id: productId });

    if (!productExists) {
      return res
        .status(404)
        .send({
          status: false,
          msg: `this ${productId} is not exist in data base`,
        });
    }

    let files = req.files;
    // const product = req.body;
    // const { title, description, style, price, currencyId, currencyFormat, availableSizes}=product
    if (files && files.length > 0) {
      var uploadedFileURL = await uploadFile(files[0]);
    }
    //   productImage = uploadedFileURL;
    const finalproduct = {
        title, description, price, currencyId: "₹", currencyFormat: "INR",isFreeShipping, productImage: uploadedFileURL, style: style, availableSizes, installments
    }

    let updatedProduct = await ProductModel.findOneAndUpdate({_id:productId}, finalproduct, {new:true})
    return res.status(200).send({status: true, msg: "Updated Successfully", data: updatedProduct}) 
    
}
    
  

   catch (err) {
    return res.status(400).send({ status: false, msg: err.message });
  }
};

const deleteById = async function (req, res) {
  try {
    const productId = req.params.productId;

    if (!validator.isValidobjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, msg: `this ${productId} is nt valid` });
    }

    let deletedProduct = await ProductModel.findById({ _id: productId });
    if (!deletedProduct)
      return res
        .status(404)
        .send({ status: false, msg: `this ${productId} is not exists inn db` });

    if (deletedProduct.isDeleted !== false)
      return res
        .status(400)
        .send({ status: false, msg: `this ${productid} is already deleted` });

    await ProductModel.findByIdAndUpdate(
      { _id: productId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    return res.status(200).send({ status: true, msg: "successfully deleted" });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message });
  }
};

module.exports.deleteById = deleteById;

module.exports.getProductById = getProductById;

module.exports.updateProductById = updateProductById;

module.exports.createProduct = createProduct;

module.exports.getSelectedProduct = getSelectedProduct;
