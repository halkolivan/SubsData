import { NavLink } from "react-router-dom";

//import images
import pp from "@assets/images/pp.png";

export default function Footer() {  
  return (
    <div className="flex sticky bottom-0 z-10 bg-gray-300 gap-4 pl-2 pr-2 mt-4 justify-between items-center rounded-b-lg">
      <div className="flex flex-1 w-full justify-start items-center">
        <span>Copyright © | SubsData 2025</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center">
        <NavLink to="/privacy">Privacy</NavLink>
        <NavLink to="/terms">Terms</NavLink>
      </div>
      <div className="flex flex-col flex-1 sm:flex-row justify-end items-center w-1/2 sm:w-auto gap-2 sm:gap-4">
        <a href="https://paypal.me/RTomayli" target="_blank">
          <img src={pp} alt="paypal" className="max-h-[40px] w-auto" />
        </a>
        <a
          href="https://github.com/halkolivan?tab=repositories"
          target="_blank"
          className="!text-black hover:!text-blue-600 sm:border-r-2 pr-2"
        >
          GitHub
        </a>
        <a
          href="mailto:gemdtera@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="!text-black  hover:!text-blue-600"
        >
          gemdtera@gmail.com
        </a>
      </div>
    </div>
  );
}
