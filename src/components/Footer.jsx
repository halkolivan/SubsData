import { NavLink } from "react-router-dom";

//import images
import pp from "@assets/images/pp.png";

export default function Footer() {  
  return (
    <footer className="flex sticky bottom-0 z-10 bg-gray-300 gap-4 pl-2 pr-2 mt-4 justify-between items-center rounded-t-lg bg-gradient-to-b from-gray-600 via-gray-300 to-gray-600">
      <div className="flex flex-1 w-full justify-start items-center text-black">
        <span>Copyright © | SubsData 2025</span>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center">
        <NavLink to="/privacy" className="!text-black hover:!text-blue-500">Privacy /</NavLink>        
        <NavLink to="/terms" className="!text-black hover:!text-blue-500">/ Terms</NavLink>
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
    </footer>
  );
}
