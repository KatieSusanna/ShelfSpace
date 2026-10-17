# Fireplace asset

The mid-detail FBX and original texture maps are stored in `source/`. The browser-ready copy is in `public/models/fireplace/`.

The FBX model contains about 11,000 triangles and is authored in centimetres. Its measured bounds convert to approximately 0.82 m deep, 1.15 m tall, and 1.38 m wide. The scene converts it to metres, rotates its front toward the room, and places it against the back wall. The runtime uses the base color, normal, roughness, and ambient occlusion maps.
