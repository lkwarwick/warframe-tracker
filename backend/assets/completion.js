(function () {
    const KEY = "wf-completion";
    const API = "/api/completion";
    let saveTimer = null;

    let currentStore = {};

    const getLocalStore = () => {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
        catch (e) { return {}; }
    };

    const setLocalStore = (data) => {
        currentStore = data;
        localStorage.setItem(KEY, JSON.stringify(data));
    };

    const updateCardState = (pill) => {
        const card = pill.closest(".card");
        if (!card) return;

        const pills = card.querySelectorAll(".component-pill");
        if (!pills.length) {
            card.classList.remove("complete");
            return;
        }

        const allComplete = Array.from(pills).every((node) => node.classList.contains("complete"));
        card.classList.toggle("complete", allComplete);
    };

    const apply = (el, key, store) => {
        const completed = !!store[key];
        el.classList.toggle("complete", completed);
        updateCardState(el);
    };

    function scheduleSave(store) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(store),
            }).catch(() => {}); // best-effort; localStorage already has it as a fallback
        }, 400);
    }

    document.addEventListener("click", function (e) {
        const pill = e.target.closest(".component-pill");
        if (!pill) return;
        const key = pill.dataset.wf + ":" + pill.dataset.idx;
        const store = { ...getLocalStore() };
        store[key] = !store[key];
        setLocalStore(store);
        apply(pill, key, store);
        scheduleSave(store);
    });

    function paint(store) {
        document.querySelectorAll(".component-pill").forEach((p) =>
            apply(p, p.dataset.wf + ":" + p.dataset.idx, store)
        );
    }

    let lazyObserver = null;

    function getLazyObserver() {
        if (lazyObserver) return lazyObserver;

        const root = document.querySelector(".card-grid") || null;
        lazyObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const img = entry.target;
                const src = img.dataset.src;
                if (!src) continue;

                img.onload = () => img.classList.add("loaded");
                img.src = src;
                lazyObserver.unobserve(img);
            }
        }, {
            root,
            rootMargin: "200px",
            threshold: 0.1,
        });

        return lazyObserver;
    }

    function initLazyImages() {
        const images = document.querySelectorAll("img.card-image.lazy:not([data-lazy-observed])");
        if (!images.length) return;

        const observer = getLazyObserver();

        images.forEach((img) => {
            img.dataset.lazyObserved = "true";
            if (img.src && img.src !== "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==") {
                img.classList.add("loaded");
                return;
            }
            observer.observe(img);
        });
    }

    function observeChanges() {
        const grid = document.querySelector(".card-grid");
        if (!grid) { requestAnimationFrame(observeChanges); return; }

        const observer = new MutationObserver(() => {
            paint(currentStore);
            initLazyImages();
        });
        observer.observe(grid, { childList: true, subtree: true });
    }

    function restore() {
        const pills = document.querySelectorAll(".component-pill");
        if (!pills.length) { requestAnimationFrame(restore); return; }
        fetch(API)
            .then((r) => r.json())
            .then((serverStore) => {
                setLocalStore(serverStore);
                paint(serverStore);
            })
            .catch(() => {
                const store = getLocalStore();
                setLocalStore(store);
                paint(store);
            });
    }

    restore();
    observeChanges();
    initLazyImages();
})();