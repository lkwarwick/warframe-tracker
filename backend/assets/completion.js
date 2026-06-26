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

    const updateCardState = (pillOrCard) => {
        const card = pillOrCard.closest ? pillOrCard.closest(".card") : pillOrCard;
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

    const setPillCompleteState = (pill, completed, store) => {
        const key = pill.dataset.wf + ":" + pill.dataset.idx;
        store[key] = !!completed;
        pill.classList.toggle("complete", !!completed);
    };

    const handleCompleteAllClick = (button) => {
        const card = button.closest(".card");
        if (!card) return;

        const pills = card.querySelectorAll(".component-pill");
        if (!pills.length) return;

        const allComplete = Array.from(pills).every((node) => node.classList.contains("complete"));
        const store = { ...getLocalStore() };

        pills.forEach((pill) => setPillCompleteState(pill, !allComplete, store));
        setLocalStore(store);
        updateCardState(card);
        scheduleSave(store);
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
        const completeAllButton = e.target.closest(".complete-all-button");
        if (completeAllButton) {
            handleCompleteAllClick(completeAllButton);
            return;
        }

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

    function getFilterState() {
        const primeRadio = document.querySelector('#prime-filter input:checked');
        const primeFilter = primeRadio ? primeRadio.value : 'all';
        const searchInput = document.getElementById('search-input');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const hideCheckbox = document.querySelector('#hide-completed-filter input[type="checkbox"]');
        const hideCompleted = hideCheckbox ? hideCheckbox.checked : false;
        return { primeFilter, query, hideCompleted };
    }

    function updateStatusText(cards, primeFilter, query, hideCompleted) {
        const activeGroup = document.querySelector('.toolbar-button.active')?.textContent?.trim() || 'Items';
        const visibleCount = Array.from(cards).filter((card) => !card.classList.contains('filtered-out')).length;
        const hideText = hideCompleted ? ' — Hide completed' : '';
        const status = document.getElementById('status-text');
        if (status) {
            status.textContent = `${activeGroup} — ${visibleCount} items — Filter: ${primeFilter}${hideText} — Query: ${query}`;
        }
    }

    function applyFilters() {
        const { primeFilter, query, hideCompleted } = getFilterState();
        const cards = document.querySelectorAll('.card-grid .card');
        cards.forEach((card) => {
            let visible = true;
            if (primeFilter === 'Prime Only' && card.dataset.prime !== 'prime') visible = false;
            if (primeFilter === 'Non-Prime Only' && card.dataset.prime !== 'nonprime') visible = false;
            if (query && !card.dataset.name.includes(query)) visible = false;
            if (hideCompleted && card.classList.contains('complete')) visible = false;
            card.classList.toggle('filtered-out', !visible);
        });
        updateStatusText(cards, primeFilter, query, hideCompleted);
    }

    function observeChanges() {
        const grid = document.querySelector(".card-grid");
        if (!grid) { requestAnimationFrame(observeChanges); return; }

        const observer = new MutationObserver(() => {
            paint(currentStore);
            initLazyImages();
            applyFilters();
        });
        observer.observe(grid, { childList: true, subtree: true });
    }

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (target.closest('#prime-filter') || target.closest('#hide-completed-filter')) {
            applyFilters();
        }
    });

    document.addEventListener('input', (event) => {
        if (event.target.id === 'search-input') {
            applyFilters();
        }
    });

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
    applyFilters();
})();