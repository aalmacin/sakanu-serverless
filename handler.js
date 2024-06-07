exports.globalLearn = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Global Learn",
    }),
  };
};

exports.globalDomains = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Global Domains",
    }),
  };
};
