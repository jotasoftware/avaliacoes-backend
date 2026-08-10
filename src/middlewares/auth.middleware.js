
const { getAuth } = require("../config/firebaseAdmin");// ajuste o path conforme onde salvou
 
exports.validateFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
 
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
 
  const token = authHeader.split(" ")[1];
 
  try {
    const decoded = await getAuth().verifyIdToken(token);
 
    // Fica disponível em qualquer controller via req.user
    req.user = decoded;
 
    return next();
  } catch (error) {
    console.error("Falha ao validar token:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

exports.validateApiKey = (
    req,
    res,
    next
  ) => {
    const apiKey =
      req.headers["x-api-key"];
  
    if (
      apiKey !== process.env.API_KEY
    ) {
      return res
        .status(401)
        .json({
          error: "Unauthorized",
        });
    }
  
    next();
  };