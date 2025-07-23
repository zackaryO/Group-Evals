# API Notes - Image Storage

## Delete Question Image

`DELETE /api/questions/:id/image`

Removes an image from a quiz question, deleting the object from S3 and clearing the `image` field.

Returns `{ message: "Image removed" }` on success.
