import * as THREE from "three";
import * as PoseFormat from "pose-format";
import { Buffer } from "buffer/";
import { scene, renderer, camera } from "./scene.js";

// fetch the pose file
const response = await fetch("./final_trimmed_video_pose.pose");
const buffer = Buffer.from(await response.arrayBuffer());
const poseData = await PoseFormat.Pose.from(buffer);

// Extract metadata
const frames = poseData.body.frames;
const frameMetadata = poseData.header.components[0].points;
const frameLeftHandMetadata = poseData.header.components[2].points;
const fps = poseData.body.fps;
const frameCount = frames.length;
const width = poseData.header.width;
const height = poseData.header.height;

// Pose Data
console.group("POSE DATA");
console.table(poseData);
console.groupEnd();

// Frame Metadata
console.group("FRAME META DATA");
console.table(frameMetadata);
console.groupEnd();

console.group("FRAME LEFTHAND META DATA");
console.table(frameLeftHandMetadata);
console.groupEnd();

// Dimensions
console.group("DIMENSIONS");
console.table([{ Width: width, Height: height }]);
console.groupEnd();

// Frames and FPS
console.group("FRAMES & FPS");
console.table([{ Frames: frames.length, FPS: fps }]);
console.groupEnd();

let normalizedLandmarks = [];
let normalizedLeftHandLandmarks = [];
let normalizedRightHandLandmarks = [];
let frameIndex = 0;

for (let i = 0; i < frameCount; i++) {
  const bodyLandmarks = frames[i].people[0]["POSE_LANDMARKS"];
  const leftHandLandmarks = frames[i].people[0]["LEFT_HAND_LANDMARKS"];
  const rightHandLandmarks = frames[i].people[0]["RIGHT_HAND_LANDMARKS"];
  normalizedLandmarks.push(
    normalizeLandmarks(bodyLandmarks, width, height, 0.15)
  );
  normalizedLeftHandLandmarks.push(
    normalizeLandmarks(leftHandLandmarks, width, height, 2)
  );
  normalizedRightHandLandmarks.push(
    normalizeLandmarks(rightHandLandmarks, width, height, 2)
  );
}

let figureGroup = new THREE.Group();
scene.add(figureGroup);

const connections = [
  // Upper body
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7], // Head and left eye
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8], // Head and right eye
  [9, 10],
  [11, 12], // Mouth
  [11, 13],
  [13, 15], // Left arm
  [12, 14],
  [14, 16], // Right arm
  // Lower body
  [23, 24], // Hips
  [11, 23],
  [12, 24],
];

const handConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [5, 9],
  [9, 13],
  [13, 17],
  [5, 17], // Palm lines
];

const skinBaseMaterial = {
  metalness: 0.0, // Skin has no metallic properties
};

const boneMaterial = new THREE.MeshPhysicalMaterial({
  ...skinBaseMaterial,
  color: 0xccbe8b, // Natural peachy skin tone
});

const jointMaterial = new THREE.MeshPhysicalMaterial({
  ...skinBaseMaterial,
  color: 0xccbe8b, // Slightly darker at joints
  roughness: 0.9, // Joints tend to be rougher
  reflectivity: 0.2, // Less reflective at joints
});

const handBoneMaterial = new THREE.MeshPhysicalMaterial({
  ...skinBaseMaterial,
  color: 0xccbe8b, // Slightly different tone for hands
  roughness: 0.8, // Hands slightly smoother
  reflectivity: 0.3, // Slightly more reflective for palm areas
});

const handJointMaterial = new THREE.MeshPhysicalMaterial({
  ...skinBaseMaterial,
  color: 0xccbe8b, // Darker tone for hand joints
  roughness: 0.88, // Between regular joints and regular skin
  reflectivity: 0.22,
});

// Pre-create geometries to reuse
const jointGeometry = new THREE.SphereGeometry(0.02, 16, 16);
const handJointGeometry = new THREE.SphereGeometry(0.01, 16, 16);

// Create bone geometry with unit length, shifted so that one end is at y=0
const boneGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 16, 1);
boneGeometry.translate(0, 0.5, 0); // Shift so that one end is at y=0

const handBoneGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1, 16, 1);
handBoneGeometry.translate(0, 0.5, 0);

// Pre-create body joints and bones
let bodyJoints = [];
let bodyBones = [];
for (let i = 0; i < frameMetadata.length; i++) {
  const joint = new THREE.Mesh(jointGeometry, jointMaterial);
  joint.castShadow = true;
  joint.receiveShadow = true;
  figureGroup.add(joint);
  bodyJoints.push(joint);
}
connections.forEach(() => {
  const bone = new THREE.Mesh(boneGeometry.clone(), boneMaterial);
  bone.castShadow = true;
  bone.receiveShadow = true;
  figureGroup.add(bone);
  bodyBones.push(bone);
});

// Pre-create hand joints and bones for both hands
let leftHandJoints = [];
let rightHandJoints = [];
let leftHandBones = [];
let rightHandBones = [];

for (let i = 0; i < 21; i++) {
  const joint = new THREE.Mesh(handJointGeometry, handJointMaterial);
  joint.castShadow = true;
  joint.receiveShadow = true;
  figureGroup.add(joint);
  leftHandJoints.push(joint);

  const rJoint = new THREE.Mesh(handJointGeometry, handJointMaterial);
  rJoint.castShadow = true;
  rJoint.receiveShadow = true;
  figureGroup.add(rJoint);
  rightHandJoints.push(rJoint);
}

handConnections.forEach(() => {
  const bone = new THREE.Mesh(handBoneGeometry.clone(), handBoneMaterial);
  bone.castShadow = true;
  bone.receiveShadow = true;
  figureGroup.add(bone);
  leftHandBones.push(bone);

  const rBone = new THREE.Mesh(handBoneGeometry.clone(), handBoneMaterial);
  rBone.castShadow = true;
  rBone.receiveShadow = true;
  figureGroup.add(rBone);
  rightHandBones.push(rBone);
});

// Add these new connections to connect hands to wrists
let leftWristConnection = new THREE.Mesh(
  handBoneGeometry.clone(),
  handBoneMaterial
);
leftWristConnection.castShadow = true;
leftWristConnection.receiveShadow = true;
figureGroup.add(leftWristConnection);

let rightWristConnection = new THREE.Mesh(
  handBoneGeometry.clone(),
  handBoneMaterial
);
rightWristConnection.castShadow = true;
rightWristConnection.receiveShadow = true;
figureGroup.add(rightWristConnection);

function updateFigure() {
  const bodyFrame = normalizedLandmarks[frameIndex];
  const leftHandFrame = normalizedLeftHandLandmarks[frameIndex];
  const rightHandFrame = normalizedRightHandLandmarks[frameIndex];

  // First, get wrist positions from body
  const leftWrist = bodyFrame[15]; // Left wrist landmark
  const rightWrist = bodyFrame[16]; // Right wrist landmark

  // Update hand positions relative to wrists
  if (leftHandFrame.length > 0 && leftWrist) {
    const handOffset = {
      x: leftWrist.x - leftHandFrame[0].x,
      y: leftWrist.y - leftHandFrame[0].y,
      z: leftWrist.z - leftHandFrame[0].z,
    };

    // Adjust all left hand landmarks relative to wrist
    leftHandFrame.forEach((landmark) => {
      if (landmark) {
        landmark.x += handOffset.x;
        landmark.y += handOffset.y;
        landmark.z += handOffset.z;
      }
    });
  }

  if (rightHandFrame.length > 0 && rightWrist) {
    const handOffset = {
      x: rightWrist.x - rightHandFrame[0].x,
      y: rightWrist.y - rightHandFrame[0].y,
      z: rightWrist.z - rightHandFrame[0].z,
    };

    // Adjust all right hand landmarks relative to wrist
    rightHandFrame.forEach((landmark) => {
      if (landmark) {
        landmark.x += handOffset.x;
        landmark.y += handOffset.y;
        landmark.z += handOffset.z;
      }
    });
  }

  // Update body joints and bones as before...
  bodyFrame.forEach((landmark, index) => {
    if (landmark && bodyJoints[index] && index < 17 && landmark.c > -1.0) {
      bodyJoints[index].position.set(landmark.x, landmark.y, landmark.z);
      bodyJoints[index].visible = true;
    } else if (bodyJoints[index]) {
      bodyJoints[index].visible = false;
    }
  });

  // Update body bones as before...
  connections.forEach(([startIdx, endIdx], idx) => {
    const startPoint = bodyFrame[startIdx];
    const endPoint = bodyFrame[endIdx];

    if (
      startPoint &&
      endPoint &&
      bodyBones[idx] &&
      startPoint.c > -1.0 &&
      endPoint.c > -1.0
    ) {
      updateBone(
        bodyBones[idx],
        new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z),
        new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z)
      );
      bodyBones[idx].visible = true;
    } else if (bodyBones[idx]) {
      bodyBones[idx].visible = false;
    }
  });

  // Update hand joints and bones
  // Update left hand joints (now using adjusted positions)
  leftHandFrame.forEach((landmark, index) => {
    if (landmark && leftHandJoints[index] && landmark.c > -1.0) {
      leftHandJoints[index].position.set(landmark.x, landmark.y, landmark.z);
      leftHandJoints[index].visible = true;
    } else if (leftHandJoints[index]) {
      leftHandJoints[index].visible = false;
    }
  });

  console.log(leftHandJoints[6].position);

  // Update right hand joints (now using adjusted positions)
  rightHandFrame.forEach((landmark, index) => {
    if (landmark && rightHandJoints[index] && landmark.c > -1.0) {
      rightHandJoints[index].position.set(landmark.x, landmark.y, landmark.z);
      rightHandJoints[index].visible = true;
    } else if (rightHandJoints[index]) {
      rightHandJoints[index].visible = false;
    }
  });

  // Update hand bones with adjusted positions
  handConnections.forEach(([startIdx, endIdx], idx) => {
    // Left hand
    if (
      leftHandFrame[startIdx] &&
      leftHandFrame[endIdx] &&
      leftHandFrame[startIdx].c > -1.0
    ) {
      updateBone(
        leftHandBones[idx],
        new THREE.Vector3(
          leftHandFrame[startIdx].x,
          leftHandFrame[startIdx].y,
          leftHandFrame[startIdx].z
        ),
        new THREE.Vector3(
          leftHandFrame[endIdx].x,
          leftHandFrame[endIdx].y,
          leftHandFrame[endIdx].z
        )
      );
      leftHandBones[idx].visible = true;
    } else {
      leftHandBones[idx].visible = false;
    }

    // Right hand
    if (
      rightHandFrame[startIdx] &&
      rightHandFrame[endIdx] &&
      rightHandFrame[endIdx].c > -1.0
    ) {
      updateBone(
        rightHandBones[idx],
        new THREE.Vector3(
          rightHandFrame[startIdx].x,
          rightHandFrame[startIdx].y,
          rightHandFrame[startIdx].z
        ),
        new THREE.Vector3(
          rightHandFrame[endIdx].x,
          rightHandFrame[endIdx].y,
          rightHandFrame[endIdx].z
        )
      );
      rightHandBones[idx].visible = true;
    } else {
      rightHandBones[idx].visible = false;
    }
  });

  // Update wrist connections
  if (leftWrist && leftHandFrame[0]) {
    updateBone(
      leftWristConnection,
      new THREE.Vector3(leftWrist.x, leftWrist.y, leftWrist.z),
      new THREE.Vector3(
        leftHandFrame[0].x,
        leftHandFrame[0].y,
        leftHandFrame[0].z
      )
    );
    leftWristConnection.visible = true;
  } else {
    leftWristConnection.visible = false;
  }

  if (rightWrist && rightHandFrame[0]) {
    updateBone(
      rightWristConnection,
      new THREE.Vector3(rightWrist.x, rightWrist.y, rightWrist.z),
      new THREE.Vector3(
        rightHandFrame[0].x,
        rightHandFrame[0].y,
        rightHandFrame[0].z
      )
    );
    rightWristConnection.visible = true;
  } else {
    rightWristConnection.visible = false;
  }
}

function updateBone(bone, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  // Align the bone to point from start to end
  bone.position.copy(start);
  bone.scale.set(1, length, 1);
  bone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  bone.updateMatrix();
}

// Animation loop
let lastFrameTime = performance.now();
const frameDuration = 1000 / fps;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaTime = now - lastFrameTime;

  if (deltaTime >= frameDuration) {
    lastFrameTime = now - (deltaTime % frameDuration);
    updateFigure();

    frameIndex = (frameIndex + 1) % frames.length;
  }

  renderer.render(scene, camera);
}

setTimeout(() => {
  animate();
}, 2000);

function normalizeLandmarks(landmarks, imageWidth, imageHeight, zMultiplier) {
  return landmarks.map((landmark) => {
    return {
      x: ((landmark.X / imageWidth) * 2 - 1) * 0.6,
      y: -((landmark.Y / imageHeight) * 2 - 1),
      z: -landmark.Z * zMultiplier,
      c: landmark.C,
    };
  });
}
