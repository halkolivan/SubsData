import { NavLink } from "react-router-dom";

//import images
import pp from "@assets/images/pp.png";

export default function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row sticky bottom-0 z-10 bg-gray-300 justify-between items-center  bg-gradient-to-b from-gray-800 via-gray-300 to-gray-600">
      <div className="flex flex-row w-full justify-between items-center border-b-1 border-gray-500 gap-2">
        <div className="flex flex-1 flex-col sm:flex-row w-full justify-start items-center text-black">
          <span className="whitespace-nowrap">Copyright © | </span>
          <span className="whitespace-nowrap">SubsData 2025</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center">
          <NavLink
            to="/privacy"
            className="!text-blue-800 hover:!text-blue-500 whitespace-nowrap"
          >
            Privacy /
          </NavLink>
          <NavLink
            to="/terms"
            className="!text-blue-800 hover:!text-blue-500 whitespace-nowrap"
          >
            / Terms
          </NavLink>
        </div>
        <div className="flex flex-1 flex-col sm:flex-row sm:flex-row justify-end items-center w-1/2 sm:w-auto sm:gap-4">
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
        </div>
      </div>

      <a
        href="mailto:gemdtera@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className="!text-black  hover:!text-blue-600 my-1 pl-3 pr-3"
      >
        gemdtera@gmail.com
      </a>

    </footer>
  );
}
