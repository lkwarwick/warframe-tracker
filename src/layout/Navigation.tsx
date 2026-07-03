import "./Navigation.css";
import { View } from "../types/view";
import { BookBookmark, Trash } from "phosphor-react";

type Props = {
  setActiveView: (v: View) => void;
};

export default function Navigation({ setActiveView}: Props ) {    
    return (
        <div className="navigation">
            <button onClick={() => setActiveView("mastery-checklist")}><BookBookmark size={24} weight="bold" />Mastery Checklist</button>
            <button onClick={() => setActiveView("prime-junk")}><Trash size={24} weight="bold" />Prime Junk</button>
        </div>
    )
}