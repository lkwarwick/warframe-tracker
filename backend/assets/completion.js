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

    const apply = (el, key, store) => el.classList.toggle("complete", !!store[key]);

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

    function observeChanges() {
        const grid = document.querySelector(".card-grid");
        if (!grid) { requestAnimationFrame(observeChanges); return; }

        const observer = new MutationObserver(() => paint(currentStore));
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
})();