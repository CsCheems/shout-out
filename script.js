//PARAMETROS//
const querystring = window.location.search;
const urlParameters = new URLSearchParams(querystring);
const StreamerbotPort = urlParameters.get('port') || '8080';
const StreamerbotAddress = urlParameters.get('address') || '127.0.0.1';
const position1 = urlParameters.get('position1') || 'top';
const position2 = urlParameters.get('position2') || 'center';
const minRole = 3;
const maxMessages = 10;
let totalMessages = 0;
let ultimoUsuario = '';
const avatarHashMap = new Map();

let initPos = 0;
let endPos = 0;
let axis = "x";

function arrangePosition() {
    // IZQUIERDA (Desliza desde izquierda)
    if (["top", "bottom"].includes(position1) && position2 === "left") {
        initPos = -600;
        endPos = -600;
        axis = "x";
    }

    // DERECHA (Desliza desde derecha)
    else if (["top", "bottom"].includes(position1) && position2 === "right") {
        initPos = 600;
        endPos = 600;
        axis = "x";
    }

    // CENTRO ARRIBA (Desliza desde arriba)
    else if (position1 === "top" && position2 === "center") {
        initPos = -300;
        endPos = -300;
        axis = "y";
    }

    // CENTER ABAJO (Desliza desde abajo)
    else if (position1 === "bottom" && position2 === "center") {
        initPos = 300;
        endPos = 300;
        axis = "y";
    }
}


const client = new StreamerbotClient({
    host: StreamerbotAddress,
    port: StreamerbotPort,
    onConnect: (data) =>{
        console.log(data);
        setConnectionStatus(true);
        console.log("Socket readyState:", client.socket.readyState);
    },
    onDisconnect: () =>{
        setConnectionStatus(false);
    }
});

client.on("General.Custom", (data) => {
  if (data.data.data.name === "Shoutout") {
    HacerMencion(data.data.data);
  }
});

async function HacerMencion(data) {
    
    if (data.name !== "Shoutout") return;

    const url = new URL(data.url);
    const params = url.searchParams;

    const username = params.get("user");
    const videoEmbedUrl = params.get("video");
    const image = params.get("image");
    const duration = parseInt(params.get("time") || "10000", 10);

    if (!username || !videoEmbedUrl) return;

    // Extraer Clip ID
    const match = videoEmbedUrl.match(/clip=([^&"]+)/);
    if (!match) return;
    const fullClipId = match[1];
    const slug = fullClipId.split("/").pop();

    // Obtener URL real del video
    const gqlUrl = "https://gql.twitch.tv/gql";
    const query = {
        operationName: "VideoAccessToken_Clip",
        variables: {
            platform: "web",
            slug: slug
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "6fd3af2b22989506269b9ac02dd87eb4a6688392d67d94e41a6886f1e9f5c00f"
            }
        }
    };

    

    let videoSrc = "";
    try {
        const res = await fetch(gqlUrl, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko"
            },
            body: JSON.stringify(query)
        });

        if (!res.ok) {
            console.error("Error fetching video source");
            return;
        }

        const result = await res.json();
        const clip = result.data.clip;
        const source = clip.videoQualities[0].sourceURL;
        const sig = clip.playbackAccessToken.signature;
        const token = encodeURIComponent(clip.playbackAccessToken.value);

        videoSrc = `${source}?sig=${sig}&token=${token}`;
    } catch (error) {
        console.error("Failed to get video source", error);
        return;
    }

    const main = document.getElementById("main-container");

    // Contenedor principal
    const container = document.createElement('div');
    container.style.position = "fixed";

    arrangePosition();
    
    //Primero reseteamos posiciones
    container.style.top = "";
    container.style.bottom = "";
    container.style.left = "";
    container.style.right = "";
    container.style.transform = "";

    //Despues asignamos dinamicamente
    container.style[position1] = "20px";
    if (position2 === "center") {
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
    } else {
        container.style[position2] = "20px";
    }
    container.style.zIndex = "1000";
    container.style.opacity = "0"; // animación inicial con gsap

    // Contenedor del video con overlay
    const videoWrapper = document.createElement('div');
    videoWrapper.style.position = "relative";
    videoWrapper.style.width = "480px";
    videoWrapper.style.height = "270px";

    // Video
    const video = document.createElement('video');
    video.src = videoSrc;
    video.width = 480;
    video.height = 270;
    video.style.display = "block";
    video.style.border = "none";
    video.style.borderRadius = "15px";
    video.style.boxShadow = "3px 3px 6px rgba(0,0,0,1)";
    video.autoplay = true;
    video.muted = false;
    video.playsInline = true;
    video.controls = false;

    // Overlay de nombre
    const overlayText = document.createElement('div');
    overlayText.innerText = `@${username}`;
    overlayText.style.position = "absolute";
    overlayText.style.bottom = "10px";
    overlayText.style.left = "10px";
    overlayText.style.color = "white";
    overlayText.style.fontSize = "1.1rem";
    overlayText.style.background = "rgba(0, 0, 0, 0.6)";
    overlayText.style.padding = "4px 8px";
    overlayText.style.borderRadius = "4px";
    overlayText.style.fontFamily = "'Uni Sans Caps', 'Impact', 'Arial Black', sans-serif";
    overlayText.style.textTransform = "uppercase";
    overlayText.style.letterSpacing = "1px";

    // Ensamblar
    videoWrapper.appendChild(video);
    videoWrapper.appendChild(overlayText);
    container.appendChild(videoWrapper);
    main.appendChild(container);

    // Animación de entrada con GSAP
    gsap.fromTo(container, {
        [axis]: initPos,
        opacity: 0
    }, {
        [axis]: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.inOut"
    });

    const exitTime = Math.max(0, duration - 2000);
    setTimeout(() => {
        gsap.to(container, {
            [axis]: endPos,
            opacity: 0,
            duration: 0.8,
            ease: "power3.in",
            onComplete: () => container.remove()
        });
    }, exitTime);
}

//STREAMERBOT STATUS FUNCTION//
function setConnectionStatus(connected){
    let statusContainer = document.getElementById('status-container');
    if(connected){
        statusContainer.style.background = "#2FB774";
        statusContainer.innerText = "CONECTADO!";
        statusContainer.style.opacity = 1;
        setTimeout(() => {
            statusContainer.style.transition = "all 2s ease";
            statusContainer.style.opacity = 0;
        }, 10);
    }else{
        statusContainer.style.background = "FF0000";
        statusContainer.innerText = "CONECTANDO...";
        statusContainer.style.transition = "";
        statusContainer.style.opacity = 1;
    }
}
