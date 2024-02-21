db.auth('admin', 'password')

db = db.getSiblingDB('crisp')

db.createUser({
  user: "admin",
  pwd: "admin",
  roles: [
    {
      role: "readWrite",
      db: "crisp"
    }
  ]
});

var adminUserId = ObjectId();
var adminAccountId = ObjectId();

let res = [
  db.users.insertOne({
    "_id": adminUserId,
    "identifier": "",
    "name": "admin",
    "enrolledCourses": [],
    "gitHandle": ""
  }),
  db.accounts.insertOne({
    "_id": adminAccountId,
    "email": "admin@example.com",
    "password": "$2b$10$Zl4PRJxyXJVLlBUv2aUn9uR5dvado3uINtVBcpeTPxEuAGwkXteKS",
    "role": "admin",
    "isApproved": true,
    "user": adminUserId
  })
];

printjson(res);