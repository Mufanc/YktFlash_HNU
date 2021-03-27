(function() {
    let style = document.createElement('style');
    style.setAttribute('injected-style', '');
    style.innerHTML = `
        .btn-next > span:hover {
            font-size: 50px;
        }
        .xt_video_player_common_list_wrap {
            display: block !important;
            opacity: 1 !important;
        }
        .xt_video_player_controls {
            bottom: 0 !important;
        }
        .xt_video_player_common_list > li[data-speed="2"]:hover {
            transform: scale(5);
        }
    `;
    document.documentElement.appendChild(style);
    // transform: scale(3);
})();