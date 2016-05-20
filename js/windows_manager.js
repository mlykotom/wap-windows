WindowsManager = {
    workplaces: [],

    options: {
        window: {
            defaultTitle: 'Empty Window',
            minWidth: 200,
            minHeight: 100,

            edges: [
                'top',
                'right',
                'bottom',
                'left'
            ]
        }
    },

    /**
     * Initializes whole magic with desktops and windows
     */
    run: function () {
        var workPlacesWrappers = document.getElementsByClassName('desktop');
        for (var i = 0; i < workPlacesWrappers.length; i++) {
            var workplace = new WindowsManager.Workplace(workPlacesWrappers[i]);
            this.workplaces.push(workplace);
        }
    },

    /**
     * Finds ancestor which has specified class
     * @see https://stackoverflow.com/questions/22119673/find-the-closest-ancestor-element-that-has-a-specific-class/22119674#22119674
     * @param el from which will start looking for
     * @param cls class which will be compared with
     * @returns {*}
     */
    findAncestor: function (el, cls) {
        //noinspection StatementWithEmptyBodyJS
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el;
    },

    /**
     * Finds window by events target
     * @returns {WindowsManager#Window}
     * @param targetNode
     * @param windowsArray
     */
    getWindow: function (targetNode, windowsArray) {
        if (!targetNode) return null;
        var windowNode = WindowsManager.findAncestor(targetNode, 'window');
        if (!windowNode) return null;
        var isBodyParent = WindowsManager.findAncestor(targetNode, 'body');
        if (isBodyParent) return null;

        // finds specified window
        for (var i = 0; i < windowsArray.length; i++) {
            if (windowsArray[i].html === windowNode) {
                return windowsArray[i];
            }
        }
        return null;
    },

    /**
     * Constructor class for window objects
     * @param htmlElement element with class window
     * @param parent
     * @constructor
     */
    Window: function (htmlElement, parent) {
        // public
        this.html = htmlElement;
        this.maximized = false;
        this.dimensions = {
            top: 0,
            left: 0,
            width: 0,
            height: 0
        };

        // private
        const _draggableArea = 5,
            _innerHTMLBefore = htmlElement.innerHTML;
        var _ribbon = null,
            _left = 0,
            _top = 0,
            _width = 0,
            _height = 0;

        /**
         * Creates body area with earlier-generated content
         * Note: MUST BE CALLED AS FIRST
         * @returns {{body: Element, edges: Array}}
         */
        var init = function () {
            /**
             * Creates ribbon element with action buttons and title
             * @param html
             * @param closeHandler
             * @param maximizeHandler
             * @returns {Element}
             */
            var initRibbon = function (html, closeHandler, maximizeHandler) {
                var ribbon = document.createElement('div');
                ribbon.className = 'ribbon no-select';
                ribbon.ondblclick = maximizeHandler;

                var actions = document.createElement('div');
                actions.className = 'actions';

                var close = document.createElement('div');
                close.className = 'close';
                close.innerHTML = 'x';
                close.onclick = closeHandler;
                actions.appendChild(close);

                var maximize = document.createElement('div');
                maximize.className = 'maximize';
                maximize.innerHTML = '+';
                maximize.onclick = maximizeHandler;
                actions.appendChild(maximize);

                ribbon.appendChild(actions);

                var h1 = document.createElement('h1');
                h1.innerHTML = html.title || WindowsManager.options.window.defaultTitle;
                ribbon.appendChild(h1);
                html.title = '';
                return ribbon;
            };
            _ribbon = initRibbon(this.html, this.close.bind(this), this.maximize.bind(this));

            var edges = [], index;
            for (index = 0; index < WindowsManager.options.window.edges.length; index++) {
                var edgeClass = WindowsManager.options.window.edges[index],
                    edge = document.createElement('div');

                edge.className = 'edge ' + edgeClass;

                var corner = document.createElement('div');
                corner.className = 'corner';

                // if it is top corner we have to put it out of edge because of overlapping
                if (edgeClass == 'top') {
                    edges.push(corner);
                }
                else {
                    edge.appendChild(corner);
                }

                edges.push(edge);
            }

            var body = document.createElement('div');
            body.className = 'body';
            body.innerHTML = _innerHTMLBefore;

            this.body = body;
            this.html.innerHTML = '';
            this.html.appendChild(_ribbon);
            for (index = 0; index < edges.length; index++) {
                this.html.appendChild(edges[index]);
            }

            this.html.appendChild(this.body);

            // starting dimensions for this window
            _left = this.html.offsetLeft;
            _top = this.html.offsetTop;
            _width = this.html.clientWidth;
            _height = this.html.clientHeight;
        }.bind(this);

        /**
         * Manipulates captured dimensions (when we want to keep it for some time)
         * @param isReset if defined, will reset kept dimensions
         */
        this.captureDimensions = function (isReset) {
            this.dimensions = {
                top: isReset ? 0 : this.html.offsetTop,
                left: isReset ? 0 : this.html.offsetLeft,
                width: isReset ? 0 : this.html.offsetWidth,
                height: isReset ? 0 : this.html.offsetHeight
            };
        };

        /**
         * Activates this window
         * @param {boolean} isActive
         * @param {(WindowsManager#Window[]|null)} windows array of all other windows which will be deactivated
         */
        this.setActive = function (isActive, windows) {
            if (isActive) {
                var allWindows = windows || [];
                // deactivates any previously activated window
                for (var i = 0; i < allWindows.length; i++) {
                    allWindows[i].setActive(false, null);
                }

                this.html.classList.add('active');
                this.html.style.zIndex = '1';
                this.captureDimensions();
            }
            else {
                this.html.classList.remove('active');
                this.html.style.zIndex = '';
                this.captureDimensions('reset');
            }
        };

        /**
         * Closes window (removes it from DOM)
         */
        this.close = function () {
            parent.removeChild(this.html);
        };

        /**
         * Toggles maximization of window
         */
        this.maximize = function () {
            this.maximized = !this.maximized;
            this.repaint();
        };

        /**
         * Repaints window and corrects body inside of it with specified parameters
         */
        this.repaint = function () {
            if (this.maximized) {
                this.html.classList.add('maximized');
                this.html.style.width = '';
                this.html.style.height = '';
                this.html.style.left = '0';
                this.html.style.top = '0';
            }
            else {
                this.html.classList.remove('maximized');
                this.html.style.width = _width + 'px';
                this.html.style.height = _height + 'px';
                this.html.style.left = _left + 'px';
                this.html.style.top = _top + 'px';
            }

            if (typeof(Storage) !== "undefined") {
                window.localStorage.setItem('left', _left);
                //localStorage.window.left = _left;
                //localStorage.window.top = _top;
            }

            // correct body
            this.body.style.height = this.html.clientHeight - _ribbon.offsetHeight - 2 * _draggableArea + 'px';
        };

        /**
         * Handles moving this window
         * @param deltaX how much moved on X axis
         * @param deltaY how much moved on Y axis
         */
        this.move = function (deltaX, deltaY) {
            if (this.maximized) return;
            this.disableTextSelection(true);
            _left = this.dimensions.left + deltaX;
            _top = this.dimensions.top + deltaY;
            this.repaint();
        };

        /**
         * Disables/enables text selecting (e.g when moving or resizing window)
         * @param isDisabled
         */
        this.disableTextSelection = function (isDisabled) {
            if (isDisabled)
                parent.classList.add('no-select');
            else
                parent.classList.remove('no-select');
        };

        /**
         * Handles resizing this window by dragging its edge
         * @param deltaX
         * @param deltaY
         * @param edge
         * @param parentEdge
         */
        this.resize = function (deltaX, deltaY, edge, parentEdge) {
            if (this.maximized) return;

            var newWidth = null,
                newHeight = null,
                newLeft = null,
                newTop = null;

            // add class so that cant select text inside window during resizing
            this.disableTextSelection(true);

            /**
             * Can resize one edge of window based on edge
             * @param {string} edge
             */
            var resizeOneEdge = function (edge) {
                switch (edge) {
                    case 'top':
                        newHeight = this.dimensions.height - deltaY;
                        newTop = this.dimensions.top + deltaY;
                        break;

                    case 'bottom':
                        newHeight = this.dimensions.height + deltaY;
                        break;

                    case 'left':
                        newWidth = this.dimensions.width - deltaX;
                        newLeft = this.dimensions.left + deltaX;
                        break;

                    case 'right':
                        newWidth = this.dimensions.width + deltaX;
                        break;
                }
            }.bind(this);

            if (edge == 'corner') {
                switch (parentEdge) {
                    case 'right':
                        resizeOneEdge('right');
                        resizeOneEdge('top');
                        break;
                    case 'bottom':
                        resizeOneEdge('right');
                        resizeOneEdge('bottom');
                        break;
                    case 'left':
                        resizeOneEdge('left');
                        resizeOneEdge('bottom');
                        break;
                    case 'top':
                        resizeOneEdge('left');
                        resizeOneEdge('top');
                        break;
                }
            }
            else {
                resizeOneEdge(edge);
            }

            // if below minimum, set the minimum
            if (newHeight !== null && newHeight < WindowsManager.options.window.minHeight) {
                newHeight = WindowsManager.options.window.minHeight;
                newTop = null;
            }
            // if below minimum, set the minimum
            if (newWidth !== null && newWidth < WindowsManager.options.window.minWidth) {
                newWidth = WindowsManager.options.window.minWidth;
                newLeft = null;
            }

            if (newWidth) _width = newWidth;
            if (newHeight) _height = newHeight;
            if (newLeft) _left = newLeft;
            if (newTop) _top = newTop;

            this.repaint();
        };

        /**
         * Handles when window stopped resizing (so that we can enable any options)
         */
        this.stopDragging = function () {
            this.disableTextSelection(false);
        };

        // ----- fires up magic ----- //
        init();
        this.repaint();
    },

    /**
     * Constructor class for workplace objects (desktops)
     * @param htmlElement element with class desktop
     * @constructor
     */
    Workplace: function (htmlElement) {
        var _html = htmlElement,
            _windows = [];

        /**
         * Initializes all windows within desktop (adds to collection + specify events)
         * @param windowDrag handler when window is dragging
         * @param windowDragStop handler when window stopped dragging
         */
        var init = function (windowDrag, windowDragStop) {
            // initialize all windows within desktop
            var windowsWrappers = _html.getElementsByClassName('window'),
                window = null;
            for (var i = 0; i < windowsWrappers.length; i++) {
                /** @type {WindowsManager#Window} **/
                window = new WindowsManager.Window(windowsWrappers[i], _html);
                _windows.push(window);
            }
            // activates last window in DOM
            //noinspection JSUnresolvedFunction
            window.setActive(true, _windows);
            // initialize workplace events
            _html.addEventListener('mousedown', _mouse.setDown.bind(_mouse));
            _html.addEventListener('mouseup', _mouse.setUp.bind(_mouse, windowDragStop));
            _html.addEventListener('mousemove', _mouse.handleDrag.bind(_mouse, windowDrag));
            _html.addEventListener('mouseenter', _mouse.enter.bind(_mouse, windowDragStop));
        };

        /**
         * Mouse object handling mouse dragging
         * @type {{isDown: boolean, window: null, target: null, startX: null, startY: null, setDown: _mouse.setDown, setUp: _mouse.setUp, handleDrag: _mouse.handleDrag}}
         * @private
         */
        var _mouse = {
            isDown: false,
            window: null,
            target: null,
            startX: null,
            startY: null,

            /**
             * Handles onmousedown event which sets flag that mouse is down on window element
             * @param event
             */
            setDown: function (event) {
                var window = WindowsManager.getWindow(event.target, _windows);
                if (!window ||
                    event.target.classList.contains('maximize') ||
                    event.target.classList.contains('close')) {
                    return;
                }

                if (event.target.classList.contains('body')) {
                    //noinspection JSUnresolvedFunction
                    window.setActive(true, _windows);
                }
                else {
                    this.target = event.target;
                    this.isDown = true;
                    this.startX = event.clientX;
                    this.startY = event.clientY;
                    this.window = window;
                    this.window.setActive(true, _windows);
                }
            },

            /**
             * Checks if any mouse is down when entering
             * @param handleDragStop
             * @param event
             */
            enter: function (handleDragStop, event) {
                if (event.buttons > 0 || !this.window) return;
                this.setUp(handleDragStop, event);
            },

            /**
             * Handles onmouseup event which nulls any property
             * @param handlerDragStop
             * @param event
             */
            setUp: function (handlerDragStop, event) {
                if (this.window) {
                    if (this.isDown && handlerDragStop) {
                        handlerDragStop(event);
                    }
                    this.window.captureDimensions('reset');
                }

                this.isDown = false;
                this.startX = null;
                this.startY = null;
                this.window = null;
                this.target = null;
            },

            /**
             * Checks if mousedown event is dragging (by testing flag) and passes event to handler
             * @param handler
             * @param event
             */
            handleDrag: function (handler, event) {
                if (!this.isDown || !this.window) return;
                handler(event);
            }
        };

        /**
         * Handle moving/resizing windows by dragging inside windows (and outside body)
         * @param event
         */
        var onWindowDrag = function (event) {
            var targetClassList = _mouse.target.classList,
                deltaX = event.clientX - _mouse.startX,
                deltaY = event.clientY - _mouse.startY;

            if (targetClassList.contains('corner')) {
                var parentNodeClassList = _mouse.target.parentNode.classList,
                    parentEdge = 'top';
                if (!parentNodeClassList.contains('window')) {
                    parentEdge = parentNodeClassList.item(1);
                }

                _mouse.window.resize(deltaX, deltaY, 'corner', parentEdge);
            }
            else if (targetClassList.contains('edge')) {
                // resizing
                _mouse.window.resize(deltaX, deltaY, targetClassList.item(1));
            }
            else {
                // moving
                _mouse.window.move(deltaX, deltaY);
            }
        };

        /**
         * Handle stop moving/resizing window
         */
        var onWindowDragStop = function () {
            _mouse.window.stopDragging();
        };

        // run the magic
        init(onWindowDrag, onWindowDragStop);
    }
};