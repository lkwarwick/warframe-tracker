import "./Navigation.css";
import { View } from "../types/view";
import { HourglassMedium } from "phosphor-react";

type Props = {
  setActiveView: (v: View) => void;
};

export default function Navigation({ setActiveView}: Props ) {    
    return (
        <div className="navigation">
            <button onClick={() => setActiveView("foundry")}><HourglassMedium size={24} weight="bold" />Foundry</button>
        </div>
    )
}