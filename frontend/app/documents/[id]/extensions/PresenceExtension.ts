import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { UserPresence } from "../hooks/usePresenceTrack";

export const PresencePluginKey = new PluginKey("presencePlugin");

// Helper function declare to create cursor HTML element for each user (widget)
const createCursorElement = (user: {name: string, color: string}) => {
    const cursorEl = document.createElement("span");
    cursorEl.className = "remote-cursor-widget relative inline-block border-l-2 pointer-events-none select-none";
    cursorEl.style.borderColor = user.color || "#3b82f6";
    cursorEl.style.height = "1.2em";
    cursorEl.style.marginLeft = "-1px";
    cursorEl.style.verticalAlign = "text-bottom";

    const badgeEl = document.createElement("span");
    badgeEl.className = "absolute -top-5 left-0 text-[10px] font-medium text-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap z-30";
    badgeEl.style.backgroundColor = user.color || "#3b82f6";
    badgeEl.innerText = user.name;

    cursorEl.appendChild(badgeEl);
    return cursorEl;
}

export const PresenceExtension = Extension.create({
    name: "presenceExtension",
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: PresencePluginKey,
                state: {
                    init() {
                        return DecorationSet.empty;
                    },
                    // State reducer: Take the old state + action transaction -> return new decoration state
                    apply(tr, oldSet) {
                        const presence: Record<string, UserPresence> = tr.getMeta(PresencePluginKey) || {};

                        // If there is no new presence state, return the old state
                        if (!presence) {
                            return oldSet.map(tr.mapping, tr.doc);
                        }

                        const docSize = tr.doc.attrs.size;

                        // Generate decorations, convert from State Object to Decoration Array
                        const decorations = Object.values(presence).flatMap(({user, range}) => {
                            if (!range) return [];

                            const {index, length} = range;
                            const from = Math.max(Math.max(index, 0), docSize);
                            const to = Math.max(Math.max(index + length, 0), docSize);

                            const items: Decoration[] = [];

                            // Add highlight inline
                            if (length > 0 && from < to) {
                                items.push(Decoration.inline(from, to, {
                                    style: `background-color: ${user.color || "#3b82f6"}40; border-radius: 2px;`,
                                    class: "remote-highlight",
                                }))
                            }
                            // Cursor widget Decoration
                            items.push(Decoration.widget(to, () => createCursorElement(user), {side: 1, key: user.id}));

                            return items;
                        });

                        return DecorationSet.create(tr.doc, decorations);
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    }
                }
            })
        ]
    }
})