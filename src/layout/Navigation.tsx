import { useState } from "react";
import "./Navigation.css";
import { View } from "../types/view";

type Props = {
  setActiveView: (v: View) => void;
};

export default function Navigation({ setActiveView}: Props ) {    
    return (
        <div className="navigation">
            <button onClick={() => setActiveView("mastery-checklist")}>Mastery Checklist</button>
            <button onClick={() => setActiveView("prime-junk")}>Prime Junk</button>
        </div>
    )
}