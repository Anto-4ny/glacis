import { auth, db, doc, getDoc, updateDoc, increment, onAuthStateChanged, arrayUnion } from './script.js';

document.addEventListener("DOMContentLoaded", async function () {
    const videoContainer = document.getElementById("video-list");
    const earningsDisplay = document.getElementById("earnings-display");
    const likedVideosDisplay = document.getElementById("liked-videos-display");

    try {
        const response = await fetch("/api/videos"); // Fetch videos from backend
        const videos = await response.json();
        if (!Array.isArray(videos)) throw new Error("Invalid video data received");

        videoContainer.innerHTML = ""; // Clear existing content

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const watchedVideos = userData.watchedVideos || []; // Store watched videos
                    const likedVideos = userData.likedVideos || []; // Store liked videos

                    earningsDisplay.textContent = `$${userData.videoEarnings || 0}`; // Display earnings
                    likedVideosDisplay.textContent = likedVideos.length; // Display liked videos count

                    videos.forEach((video) => {
                        const hasWatched = watchedVideos.includes(video.videoId);
                        const hasLiked = likedVideos.includes(video.videoId);

                        const videoElement = `
                            <div class="bg-gray-900 rounded-lg overflow-hidden shadow-lg p-4">
                                <iframe class="w-full h-40" src="https://www.youtube.com/embed/${video.videoId}" frameborder="0" allowfullscreen onload="window.attachPlayerEvents(this)"></iframe>
                                <h4 class="text-white text-lg font-semibold mt-2">${video.title}</h4>
                                <button id="watch-${video.videoId}" class="mt-2 px-4 py-2 rounded ${hasWatched ? 'bg-gray-500' : 'bg-green-500'} text-white" ${hasWatched ? 'disabled' : ''}>
                                    ${hasWatched ? 'Watched' : 'Watch'}
                                </button>
                                <button id="like-${video.videoId}" class="mt-2 px-4 py-2 rounded ${hasLiked ? 'bg-gray-500' : 'bg-blue-500'} text-white" ${hasLiked ? 'disabled' : ''}>
                                    ${hasLiked ? 'Liked' : 'Like'}
                                </button>
                                <p id="message-${video.videoId}" class="text-sm mt-2"></p>
                            </div>
                        `;

                        videoContainer.innerHTML += videoElement;

                        document.getElementById(`watch-${video.videoId}`).addEventListener("click", () => window.rewardUserForWatching(video.videoId));
                        document.getElementById(`like-${video.videoId}`).addEventListener("click", () => window.likeVideo(video.videoId));
                    });
                }
            }
        });
    } catch (error) {
        console.error("Error fetching videos:", error);
    }
});

// ✅ Ensure global accessibility
window.attachPlayerEvents = function (iframe) {
    iframe.addEventListener("ended", function () {
        const videoId = new URL(iframe.src).searchParams.get("v");
        window.rewardUserForWatching(videoId);
    });
};

// ✅ Reward user for watching full video
window.rewardUserForWatching = function (videoId) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.watchedVideos && userData.watchedVideos.includes(videoId)) {
                    document.getElementById(`message-${videoId}`).textContent = "You have already watched this video.";
                    document.getElementById(`message-${videoId}`).classList = "text-yellow-400";
                    return;
                }

                try {
                    await updateDoc(userRef, {
                        videoEarnings: increment(5),
                        watchedVideos: arrayUnion(videoId)
                    });

                    document.getElementById(`watch-${videoId}`).textContent = "Watched";
                    document.getElementById(`watch-${videoId}`).classList = "mt-2 px-4 py-2 rounded bg-gray-500 text-white";
                    document.getElementById(`watch-${videoId}`).disabled = true;

                    document.getElementById(`message-${videoId}`).textContent = "You earned $5 for watching this video!";
                    document.getElementById(`message-${videoId}`).classList = "text-green-400";

                    const updatedUserSnap = await getDoc(userRef);
                    document.getElementById("earnings-display").textContent = `$${updatedUserSnap.data().videoEarnings}`;
                } catch (error) {
                    document.getElementById(`message-${videoId}`).textContent = "Error updating earnings.";
                    document.getElementById(`message-${videoId}`).classList = "text-red-400";
                    console.error('Error updating earnings:', error);
                }
            }
        }
    });
};

// ✅ Like a video
window.likeVideo = function (videoId) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.likedVideos && userData.likedVideos.includes(videoId)) {
                    document.getElementById(`message-${videoId}`).textContent = "You have already liked this video.";
                    document.getElementById(`message-${videoId}`).classList = "text-yellow-400";
                    return;
                }

                try {
                    await updateDoc(userRef, {
                        likedVideos: arrayUnion(videoId)
                    });

                    document.getElementById(`like-${videoId}`).textContent = "Liked";
                    document.getElementById(`like-${videoId}`).classList = "mt-2 px-4 py-2 rounded bg-gray-500 text-white";
                    document.getElementById(`like-${videoId}`).disabled = true;

                    document.getElementById(`message-${videoId}`).textContent = "You liked this video!";
                    document.getElementById(`message-${videoId}`).classList = "text-green-400";

                    const updatedUserSnap = await getDoc(userRef);
                    document.getElementById("liked-videos-display").textContent = updatedUserSnap.data().likedVideos.length;
                } catch (error) {
                    document.getElementById(`message-${videoId}`).textContent = "Error liking video.";
                    document.getElementById(`message-${videoId}`).classList = "text-red-400";
                    console.error('Error liking video:', error);
                }
            }
        }
    });
};
